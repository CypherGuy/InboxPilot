import boto3
import email
from email import policy
import json
import uuid
import traceback
from datetime import datetime, timedelta
from email.utils import parseaddr
from boto3.dynamodb.conditions import Attr

# AWS clients
s3 = boto3.client("s3")
ses = boto3.client("ses", region_name="eu-west-1")
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-1")
dynamodb = boto3.resource("dynamodb")
emails_table = dynamodb.Table("Emails")
users_table = dynamodb.Table("Users")

# Configuration
MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
GUARDRAIL_ID = "eca3sfgwx0sr"
GUARDRAIL_VERSION = "DRAFT"


def lambda_handler(event, context):
    rec0 = event["Records"][0]

    if "ses" in rec0:
        # SES receipt rule invocation
        action = rec0["ses"]["receipt"]["action"]
        bucket = action["bucketName"]
        key = action["objectKey"]
    else:
        # From S3 → Lambda notification
        s3rec = rec0["s3"]
        bucket = s3rec["bucket"]["name"]
        key = s3rec["object"]["key"]

    # fetch raw email bytes from S3
    raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    msg = email.message_from_bytes(raw, policy=policy.default)

    subject = msg.get("subject", "[No Subject]")
    sender = msg.get("from", "[Unknown sender]")
    sender_name, sender_email = parseaddr(sender)
    body = extract_body(msg)

    # Determine the recipient address
    to_header = msg.get("to", "[Unknown recipient]")
    _, fallback_to = parseaddr(to_header)
    recipients = rec0.get("ses", {}).get("receipt", {}).get("recipients", [])
    to_email = recipients[0] if recipients else fallback_to

    # classify the email
    triage, is_offensive = classify_email(subject, body)

    auto_reply = None
    if triage == "Partnerships":
        try:
            # find the user by proxyEmail to send auto-reply
            user_resp = users_table.scan(
                FilterExpression=Attr("proxyEmail").eq(to_email)
            )
            if user_resp.get("Items"):
                user_item = user_resp["Items"][0]
                reply_tmpl = user_item.get(
                    "replyTemplate", "Thanks for reaching out!")
                proxy_email = user_item.get("proxyEmail", to_email)
                auto_reply = reply_tmpl
                send_reply_email(
                    reply_from=proxy_email,
                    reply_to=sender_email,
                    reply_body=reply_tmpl,
                    original_subject=subject
                )
            else:
                print(f"❌ No user with proxyEmail={to_email}")
        except Exception as e:
            print(f"❌ Auto-reply error: {e}")

    # build the DynamoDB item
    item = {
        "emailId":    str(uuid.uuid4()),
        "userID":     to_email,
        "senderName": sender_name,
        "fromEmail":  sender_email,
        "toEmail":    to_email,
        "subject":    subject,
        "body":       body[:1000],
        "triage":     triage,
        "timestamp": datetime.utcnow().replace(microsecond=0).isoformat()
    }
    if is_offensive:
        item["expirationTime"] = int(
            (datetime.utcnow() + timedelta(days=30)).timestamp())
    if auto_reply:
        item["autoReply"] = auto_reply
        item["autoReplySentAt"] = datetime.utcnow().isoformat()

    emails_table.put_item(Item=item)
    return {"statusCode": 200}


def extract_body(msg):
    text = None
    if msg.is_multipart():
        # prefer plain-text part
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                text = part.get_content()
                break
        # fallback to HTML
        if not text:
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    text = part.get_content()
                    break
    else:
        text = msg.get_content()

    if not text:
        return ""

    # normalize line endings
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def classify_email(subject, body):
    system_prompt = (
        "You are a classification assistant. "
        "Categorize this email into exactly one of: Sales focused emails (Someone trying to sell you something), Job Applications, Spam, Partnerships including future business opportunities, Miscellaneous (Not any of the previous), or Unsorted (Unable to be sorted due to length etc..). "
        "If the email contains abusive, threatening, or inappropriate content in a non-casual way, choose 'Offensive'. "
        "If it contains deceptive or scam-like content (e.g. phishing), choose 'Spam'. "
        "If a significant majority of an email cannot be read for whatever reason, mark it as 'Unsorted'."
        "Only respond with the single label in the exact case as listed."
    )
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 70,
        "system": system_prompt,
        "messages": [{
            "role": "user",
            "content": [{
                "type": "text",
                "text": f"Subject: {subject}\n\nBody:\n{body}"
            }]
        }],
    }

    try:
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion=GUARDRAIL_VERSION,
            body=json.dumps(payload),
        )
        raw = response["body"].read().decode()
        print("📤 Claude raw response:", raw)
        out = json.loads(raw)

        if "content" in out and isinstance(out["content"], list):
            label = out["content"][0].get("text", "").strip()
        elif "completion" in out:
            label = out["completion"].strip()
        else:
            label = "Unknown"

        return ("Offensive", True) if label.lower() == "offensive" else (label, False)
    except Exception as e:
        print("❌ Classification error:", e)
        return "Unknown", False


def send_reply_email(reply_from, reply_to, reply_body, original_subject):
    try:
        verified_sender = "noreply@inboxpilot.xyz"
        ses.send_email(
            Source=verified_sender,
            Destination={"ToAddresses": [reply_to]},
            ReplyToAddresses=[reply_from],
            Message={
                "Subject": {"Data": f"Re: {original_subject}"},
                "Body":    {"Text": {"Data": reply_body}},
            },
        )
    except Exception as e:
        print(f"❌ Failed to send auto-reply: {e}")
