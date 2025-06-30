import bcrypt
import json
import os
import re
import time
from decimal import Decimal
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Attr
import boto3

SECRET_TOKEN = os.environ["AUTH_TOKEN"]
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("Users")
emails_table = dynamodb.Table("Emails")
bedrock = boto3.client("bedrock-runtime", region_name="eu-west-1")

MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
GUARDRAIL_ID = "eca3sfgwx0sr"
GUARDRAIL_VERSION = "DRAFT"


def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def make_response(status_code, body_dict, event=None):
    headers = (event or {}).get("headers", {})
    origin = {k.lower(): v for k, v in headers.items()}.get("origin")
    allowed = {"http://localhost:3000", "https://www.inboxpilot.xyz"}
    cors = origin if origin in allowed else "https://www.inboxpilot.xyz"
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type":                  "application/json",
            "Access-Control-Allow-Origin":   cors,
            "Access-Control-Allow-Headers":  "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods":  "OPTIONS,POST,GET",
            "Access-Control-Allow-Credentials": "true",
        },
        "body": json.dumps(convert_decimals(body_dict)),
    }


def register_handler(event, context):
    body = json.loads(event.get("body", "{}"))
    user_id = body.get("userID")
    raw_password = body.get("password")
    if not user_id or not raw_password:
        return make_response(400, {"error": "Missing userID or password"}, event)
    name = body.get("name", user_id)
    proxy_email = body.get("proxyEmail", f"{user_id}@inboxpilot.xyz")
    reply_template = body.get(
        "replyTemplate", "Hey, I'll get back to you soon!")
    if users_table.get_item(Key={"userID": user_id}).get("Item"):
        return make_response(400, {"error": "User already exists"}, event)
    hashed_pw = bcrypt.hashpw(raw_password.encode(), bcrypt.gensalt()).decode()
    users_table.put_item(Item={
        "userID":        user_id,
        "name":          name,
        "proxyEmail":    proxy_email,
        "replyTemplate": reply_template,
        "password":      hashed_pw,
    })
    user_obj = {
        "userID":        user_id,
        "name":          name,
        "proxyEmail":    proxy_email,
        "replyTemplate": reply_template,
    }
    return make_response(200, {"message": "User registered successfully.", "token": SECRET_TOKEN, "user": user_obj}, event)


def login_handler(event, context):
    body = json.loads(event.get("body", "{}"))
    user_id = body.get("userID")
    raw_password = body.get("password")
    if not user_id or not raw_password:
        return make_response(400, {"message": "Missing credentials"}, event)
    resp = users_table.get_item(Key={"userID": user_id})
    item = resp.get("Item")
    if not item or "password" not in item:
        return make_response(401, {"message": "Invalid credentials"}, event)
    if not bcrypt.checkpw(raw_password.encode(), item["password"].encode()):
        return make_response(401, {"message": "Invalid credentials"}, event)
    item.pop("password", None)
    return make_response(200, {"message": "Login successful", "token": SECRET_TOKEN, "user": item}, event)


def reply_handler(event, context):
    user_id = (event.get("queryStringParameters") or {}).get("userID")
    if not user_id:
        return make_response(400, {"error": "Missing userID"}, event)
    resp = users_table.get_item(Key={"userID": user_id})
    item = resp.get("Item")
    if not item:
        return make_response(404, {"error": "User not found"}, event)
    return make_response(200, {"reply": item.get("replyTemplate", "Hey, I'll get back soon!")}, event)


def emails_handler(event, context):
    qs = event.get("queryStringParameters") or {}
    to_email = qs.get("toEmail")
    triage = qs.get("triage")
    new_only = qs.get("new") == "true"
    if not to_email:
        return make_response(400, {"error": "Missing toEmail"}, event)
    expr = Attr("toEmail").eq(to_email)
    if new_only:
        cutoff = time.time() - 3600
        expr &= Attr("timestamp").gt(time.strftime(
            "%Y-%m-%dT%H:%M:%S", time.gmtime(cutoff)))
    if triage and triage != "All Emails":
        expr &= Attr("triage").eq(triage)
    items = emails_table.scan(FilterExpression=expr).get("Items", [])
    return make_response(200, {"emails": items}, event)


def update_reply_handler(event, context):
    body = json.loads(event.get("body", "{}"))
    user_id = body.get("userID")
    new_template = body.get("replyTemplate")
    if not user_id or not new_template:
        return make_response(400, {"error": "Missing userID or replyTemplate"}, event)
    users_table.update_item(
        Key={"userID": user_id},
        UpdateExpression="SET replyTemplate = :r",
        ExpressionAttributeValues={":r": new_template}
    )
    return make_response(200, {"message": "Reply template updated"}, event)


def update_triage_handler(event, context):
    body = json.loads(event.get("body", "{}"))
    email_id = body.get("emailId")
    ts = body.get("timestamp")
    new_triage = body.get("newTriage")
    if not email_id or not ts or not new_triage:
        return make_response(400, {"error": "Missing emailId, timestamp, or newTriage"}, event)
    allowed = {"Sales", "Applications", "Spam", "Partnerships",
               "Miscellaneous", "Unsorted", "Offensive", "Flagged"}
    if new_triage not in allowed:
        return make_response(400, {"error": f"Invalid triage: {new_triage}"}, event)
    try:
        emails_table.update_item(
            Key={"emailId": email_id, "timestamp": ts},
            UpdateExpression="SET triage = :t",
            ExpressionAttributeValues={":t": new_triage},
            ConditionExpression="attribute_exists(emailId) AND attribute_exists(#ts)",
            ExpressionAttributeNames={"#ts": "timestamp"}
        )
        return make_response(200, {"message": "Triage updated successfully"}, event)
    except emails_table.meta.client.exceptions.ConditionalCheckFailedException:
        return make_response(404, {"error": "Email not found"}, event)


def invoke_and_parse_llm(nl_query: str) -> dict:
    system = (
        "Convert the query into a JSON object using only these keys: "
        "\"triage\",\"fromEmail\",\"subject\",\"bodyContains\","
        "\"beforeDate\",\"afterDate\",\"onDate\"."
    )
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens":        100,
        "system":            system,
        "messages": [{
            "role": "user",
            "content": [{"type": "text", "text": nl_query}]
        }],
    }
    resp = bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        guardrailIdentifier=GUARDRAIL_ID,
        guardrailVersion=GUARDRAIL_VERSION,
        body=json.dumps(payload),
    )
    llm_out = json.loads(resp["body"].read().decode())
    text = (llm_out.get("content") or [
            {"text": llm_out.get("completion", "")}])[0]["text"]
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError(f"No JSON found in LLM output: {text!r}")
    return json.loads(m.group(0))


def filter_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        user_id = body.get("userID")
        natural_query = (body.get("query") or "").strip()
        if not user_id or not natural_query:
            return make_response(400, {"error": "Missing userID or query"}, event)

        # Extract triage if it's at the start
        allowed = ["Sales", "Applications", "Partnerships", "Spam",
                   "Miscellaneous", "Unsorted", "Offensive", "Flagged"]
        extracted_triage = None
        for cat in allowed:
            if re.match(rf"^{cat}(?:\s+emails?)?\b", natural_query, re.IGNORECASE):
                extracted_triage = cat
                natural_query = re.sub(
                    rf"^{cat}(?:\s+emails?)?\s*", "", natural_query, flags=re.IGNORECASE)
                break

        # Parse the rest with LLM
        criteria = invoke_and_parse_llm(natural_query)
        if extracted_triage:
            criteria["triage"] = extracted_triage

        # Normalize triage if still missing
        if not criteria.get("triage"):
            lq = natural_query.lower()
            for cat in allowed:
                if cat.lower() in lq:
                    criteria["triage"] = cat
                    break

        # Build DynamoDB FilterExpression
        expr = Attr("toEmail").eq(user_id)
        if t := criteria.get("triage"):
            expr &= Attr("triage").eq(t)
        if f := criteria.get("fromEmail"):
            expr &= Attr("fromEmail").contains(f)
        if b := (criteria.get("bodyContains") or "").strip():
            expr &= Attr("body").contains(b)

        items = emails_table.scan(FilterExpression=expr).get("Items", [])

        # Python-level filtering for subject, body, and dates (case-insensitive)
        def to_dt(s): return datetime.fromisoformat(s)
        subj_q = (criteria.get("subject") or "").strip().lower()
        subj_q_singular = subj_q.rstrip(
            "s") if subj_q.endswith("s") else subj_q
        body_q = (criteria.get("bodyContains") or "").strip().lower()

        filtered = []
        for item in items:
            subj = (item.get("subject") or "").lower()
            body = (item.get("body") or "").lower()
            ts = to_dt(item["timestamp"])

            if subj_q and not (subj_q in subj or subj_q_singular in subj):
                continue
            if body_q and body_q not in body:
                continue
            if bd := criteria.get("beforeDate"):
                if ts >= to_dt(bd):
                    continue
            if ad := criteria.get("afterDate"):
                if ts <= to_dt(ad):
                    continue
            if od := criteria.get("onDate"):
                if ts.date() != to_dt(od).date():
                    continue
            filtered.append(item)

        return make_response(200, {"emails": filtered}, event)

    except Exception as e:
        print("❌ filter_handler error:", e)
        return make_response(500, {"error": "Internal server error", "details": str(e)}, event)


def lambda_handler(event, context):
    method = event.get("httpMethod")
    resource = event.get("resource")

    if method == "OPTIONS":
        return make_response(200, {"message": "CORS preflight OK"}, event)

    if method == "POST" and resource == "/register":
        return register_handler(event, context)
    elif method == "POST" and resource == "/login":
        return login_handler(event, context)
    elif method == "GET" and resource == "/reply":
        return reply_handler(event, context)
    elif method == "GET" and resource == "/emails":
        return emails_handler(event, context)
    elif method == "POST" and resource == "/update-reply":
        return update_reply_handler(event, context)
    elif method == "POST" and resource == "/update-triage":
        return update_triage_handler(event, context)
    elif method == "POST" and resource == "/filter":
        return filter_handler(event, context)
    else:
        return make_response(404, {"error": "Route not found"}, event)
