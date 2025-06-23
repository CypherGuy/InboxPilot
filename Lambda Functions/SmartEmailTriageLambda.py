import boto3
import email
from email import policy
import json
import uuid
from datetime import datetime, timedelta

# AWS clients
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-1")
s3 = boto3.client("s3")
dynamodb = boto3.client("dynamodb")

# Configuration
MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
GUARDRAIL_ID = "eca3sfgwx0sr"
GUARDRAIL_VERSION = "DRAFT"
TABLE_NAME = "Emails"


def lambda_handler(event, context):

    try:
        rec0 = event["Records"][0]
        if "ses" in rec0:
            # SES receipt rule invocation
            action = rec0["ses"]["receipt"]["action"]
            bucket = action["bucketName"]
            key = action["objectKey"]
        elif "s3" in rec0:
            # plain S3 → Lambda notification
            s3rec = rec0["s3"]
            bucket = s3rec["bucket"]["name"]
            key = s3rec["object"]["key"]
        else:
            raise KeyError("neither ‘ses’ nor ‘s3’ in Records[0]")
        print(f"Fetching email from s3://{bucket}/{key}")
    except Exception as e:
        print(f"Can't extract bucket from event: {e}")
        return {"statusCode": 400}

    try:
        raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    except Exception as e:
        print(f"S3 download failed: {e}")
        return {"statusCode": 500}

    try:
        msg = email.message_from_bytes(raw, policy=policy.default)
        subject = msg.get("subject", "[No Subject]")
        sender = msg.get("from",    "[Unknown sender]")
        body = extract_body(msg)
    except Exception as e:
        print(f"Email parsing failed: {e}")
        return {"statusCode": 500}

    triage, is_flagged = classify_email(subject, body)

    if is_flagged:
        expiration_time = int(
            (datetime.utcnow() + timedelta(days=30)).timestamp())
    item = {
        "emailId": {"S": str(uuid.uuid4())},
        "from":    {"S": sender},
        "subject": {"S": subject},
        "body":    {"S": body[:1000]},
        "triage":  {"S": triage},
        "timestamp": {"S": datetime.utcnow().isoformat()}
    }
    if is_flagged:
        item["expirationTime"] = {"N": str(expiration_time)}

    try:
        dynamodb.put_item(TableName=TABLE_NAME, Item=item)
    except Exception as e:
        print(f"DynamoDB write failed: {e}")

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
        "Categorize this email into exactly one of: Sales, Job, Spam, Other, or Unknown. "
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

        if label.lower() == "flagged":
            return "Flagged", True
        return label, False

    except Exception as e:
        return "Unknown", False
