import boto3
import json
import decimal
from boto3.dynamodb.conditions import Attr
from email.utils import parseaddr
from datetime import datetime

# AWS clients
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-1")
dynamodb = boto3.resource("dynamodb")
emails_table = dynamodb.Table("Emails")

# Constants for Bedrock
MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
GUARDRAIL_ID = "eca3sfgwx0sr"
GUARDRAIL_VERSION = "DRAFT"


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        natural_query = body.get("query", "")
        user_id = body.get("userID")

        if not natural_query or not user_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'query' or 'userID'"})
            }

        filter_criteria = classify_natural_query(natural_query)

        KNOWN_TRIAGE = {
            "Sales", "Applications", "Spam", "Partnerships",
            "Miscellaneous", "Unsorted", "Offensive", "Flagged"
        }
        if "triage" in filter_criteria:
            t = filter_criteria["triage"]
            if isinstance(t, list):
                filter_criteria["triage"] = [
                    tag if tag in KNOWN_TRIAGE else "Unsorted"
                    for tag in t
                ]
            else:
                filter_criteria["triage"] = (
                    t if t in KNOWN_TRIAGE else "Unsorted"
                )

        if not isinstance(filter_criteria, dict):
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Could not extract filter from query"})
            }

        # Step 2: Run DynamoDB scan with filters
        filtered_items = scan_emails(user_id, filter_criteria)

        return {
            "statusCode": 200,
            "body": json.dumps(filtered_items, cls=DecimalEncoder),
            "headers": {"Content-Type": "application/json"}
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


def classify_natural_query(query):
    instructions = """
You are an AI assistant that converts user queries into filters for email search.
Your response MUST be a valid JSON object. Do NOT wrap it in code blocks or quotes. DO NOT MAKE YOUR OWN TAG, ONLY USE ONE OF THE ONES BELOW.

Allowed tags: "triage", "fromEmail", "subject", "beforeDate", "afterDate", "onDate". YOU MUST ONLY PICK FROM THESE, DO NOT MAKE YOUR OWN TAG

Use key "onDate" to match emails from a specific date.

Handle logical combinations (e.g. "flagged or partnership") by returning an array under the "triage" key:
Example: {"triage": ["Flagged", "Partnerships"]}

Examples:

Input: Show me all spam emails
Output: {"triage": ["Spam"]}

Input: All emails from john@example.com about payment
Output: {"fromEmail": "john@example.com", "subject": "payment"}

Input: Show me flagged or partnership emails
Output: {"triage": ["Flagged", "Partnerships"]}

Input: Emails from jane@doe.com before 2024-01-01
Output: {"fromEmail": "jane@doe.com", "beforeDate": "2024-01-01"}

Input: All flagged emails on 2025-06-28
Output: {"triage": ["Flagged"], "onDate": "2025-06-28"}

Input: Emails about lunch
Output: {"subject": "lunch"}

Now respond only with a valid JSON object:
""".strip()

    full_prompt = f"{instructions}\n\nInput: {query}"

    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 100,
        "system": "You are a helpful assistant.",
        "messages": [
            {"role": "user", "content": [
                {"type": "text", "text": full_prompt}]}
        ],
    }

    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        guardrailIdentifier=GUARDRAIL_ID,
        guardrailVersion=GUARDRAIL_VERSION,
        body=json.dumps(payload),
    )

    raw = response["body"].read().decode()
    print("🧠 LLM Response:", repr(raw))

    out = json.loads(raw)
    if "content" in out and isinstance(out["content"], list):
        text = out["content"][0]["text"]
    elif "completion" in out:
        text = out["completion"]
    else:
        return {}

    text = text.strip()

    KNOWN_TRIAGE = {
        "Sales", "Applications", "Spam", "Partnerships",
        "Miscellaneous", "Unsorted", "Offensive"
    }

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        t = text.capitalize()
        if t in KNOWN_TRIAGE:
            return {"triage": [t]}
        else:
            return {"subject": text}


def scan_emails(user_id, filters):
    filter_expr = Attr("userID").eq(user_id)

    # Triaged filter
    if "triage" in filters:
        triage_val = filters["triage"]
        if isinstance(triage_val, list):
            triage_filter = Attr("triage").eq(triage_val[0])
            for tag in triage_val[1:]:
                triage_filter = triage_filter | Attr("triage").eq(tag)
            filter_expr = filter_expr & triage_filter
        else:
            filter_expr = filter_expr & Attr("triage").eq(triage_val)

    # From email
    if "fromEmail" in filters:
        filter_expr = filter_expr & Attr(
            "fromEmail").contains(filters["fromEmail"])

    items = emails_table.scan(FilterExpression=filter_expr).get("Items", [])

    # Case-insensitive subject filtering
    if "subject" in filters:
        keyword = filters["subject"].lower()
        items = [item for item in items if keyword in item.get(
            "subject", "").lower()]

    # Date filtering using datetime
    if "beforeDate" in filters:
        try:
            before = datetime.fromisoformat(filters["beforeDate"])
            items = [item for item in items if "timestamp" in item and datetime.fromisoformat(
                item["timestamp"]) < before]
        except Exception:
            pass

    if "afterDate" in filters:
        try:
            after = datetime.fromisoformat(filters["afterDate"])
            items = [item for item in items if "timestamp" in item and datetime.fromisoformat(
                item["timestamp"]) > after]
        except Exception:
            pass

    if "onDate" in filters:
        try:
            target = datetime.fromisoformat(filters["onDate"]).date()
            items = [item for item in items if "timestamp" in item and datetime.fromisoformat(
                item["timestamp"]).date() == target]
        except Exception:
            pass

    return items
