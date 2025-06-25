import boto3
import email
from email import policy
import json
import uuid
from datetime import datetime, timedelta
from email.utils import parseaddr

# AWS clients
s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-1")
dynamodb = boto3.resource("dynamodb")
emails_table = dynamodb.Table("Emails")

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
        recipients = event["Records"][0]["ses"]["receipt"]["recipients"]
        to_email = recipients[0] if recipients else "[Unknown recipient]"
    else:
        # From S3 → Lambda notification
        s3rec = rec0["s3"]
        bucket = s3rec["bucket"]["name"]
        key = s3rec["object"]["key"]
        to_email = "[Unknown recipient]"

    raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    msg = email.message_from_bytes(raw, policy=policy.default)
    subject = msg.get("subject", "[No Subject]")
    sender = msg.get("from", "[Unknown sender]")
    sender_name, sender_email = parseaddr(sender)
    body = extract_body(msg)

    triage, is_flagged = classify_email(subject, body)

    item = {
        "emailId": str(uuid.uuid4()),
        "userID": to_email,
        "senderName": sender_name,
        "fromEmail": sender_email,
        "toEmail": to_email,
        "subject": subject,
        "body": body[:1000],
        "triage": triage,
        "timestamp": datetime.utcnow().isoformat()
    }

    if is_flagged:
        item["expirationTime"] = int(
            (datetime.utcnow() + timedelta(days=30)).timestamp())

    emails_table.put_item(Item=item)
    return {"statusCode": 200}


def extract_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                return part.get_content()
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                return part.get_content()
    return msg.get_content()


def classify_email(subject, body):
    system_prompt = (
        "You are a classification assistant. "
        "Categorize this email into exactly one of: Sales, Job, Spam, Business Opportunity, Other, or Unknown. "
        "If the email contains offensive or harmful content, choose Spam. "
        "Only respond with the single label."
    )

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 70,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Subject: {subject}\n\nBody:\n{body}"
                    }
                ]
            }
        ]
    }

    try:
        resp = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            guardrailIdentifier=GUARDRAIL_ID,
            guardrailVersion=GUARDRAIL_VERSION,
            body=json.dumps(payload),
        )
        out = json.loads(resp["body"].read())
        label = out["content"][0]["text"].strip()
        return ("Flagged", True) if label.lower() == "flagged" else (label, False)
    except:
        return "Unknown", False
