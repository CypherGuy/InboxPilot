import bcrypt
from boto3.dynamodb.conditions import Attr
import json
import boto3
import os
import time
from decimal import Decimal

SECRET_TOKEN = os.environ["AUTH_TOKEN"]
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("Users")
emails_table = dynamodb.Table("Emails")


def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def make_response(status_code, body_dict, event=None):
    headers = event.get("headers", {}) if event else {}

    # Normalize keys to lowercase to ensure we catch 'origin' or 'Origin'
    headers_lower = {k.lower(): v for k, v in headers.items()}
    origin = headers_lower.get("origin")

    allowed_origins = {"http://localhost:3000", "https://www.inboxpilot.xyz"}
    cors_origin = origin if origin in allowed_origins else "https://www.inboxpilot.xyz"

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(convert_decimals(body_dict))
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

    existing = users_table.get_item(Key={"userID": user_id})
    if "Item" in existing:
        return make_response(400, {"error": "User already exists"}, event)

    hashed_pw = bcrypt.hashpw(raw_password.encode(
        'utf-8'), bcrypt.gensalt()).decode('utf-8')

    users_table.put_item(Item={
        "userID": user_id,
        "name": name,
        "proxyEmail": proxy_email,
        "replyTemplate": reply_template,
        "password": hashed_pw
    })

    user_obj = {
        "userID": user_id,
        "name": name,
        "proxyEmail": proxy_email,
        "replyTemplate": reply_template
    }

    return make_response(200, {
        "message": "User registered successfully.",
        "token": SECRET_TOKEN,
        "user": user_obj
    }, event)


def login_handler(event, context):
    body = json.loads(event["body"])
    user_id = body.get("userID")
    raw_password = body.get("password")

    if not user_id or not raw_password:
        return make_response(400, {"message": "Missing credentials"}, event)

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" not in response:
        return make_response(401, {"message": "Invalid credentials"}, event)

    stored_user = response["Item"]
    hashed_pw = stored_user.get("password")

    if not hashed_pw:
        return make_response(401, {"message": "Invalid credentials"}, event)

    password_match = bcrypt.checkpw(
        raw_password.encode('utf-8'), hashed_pw.encode('utf-8'))

    if not password_match:
        return make_response(401, {"message": "Invalid credentials"}, event)

    # Remove password before returning user data
    stored_user.pop("password", None)

    # Return both the user object and the auth token
    return make_response(200, {
        "message": "Login successful",
        "token": SECRET_TOKEN,
        "user": stored_user
    }, event)


def reply_handler(event, context):
    user_id = event.get("queryStringParameters", {}).get("userID")

    if not user_id:
        return make_response(400, {"error": "Missing userID"}, event)

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" in response:
        reply = response["Item"].get(
            "replyTemplate", "Hey, Thanks for reaching out. I'll get back to you soon!")
        return make_response(200, {"reply": reply}, event)
    else:
        return make_response(404, {"error": "User not found"}, event)


def emails_handler(event, context):
    try:
        qs = event.get("queryStringParameters") or {}
        to_email = qs.get("toEmail")
        triage = qs.get("triage")
        new_only = qs.get("new") == "true"

        if not to_email:
            return make_response(400, {"error": "Missing toEmail"}, event)

        filter_expression = Attr("toEmail").eq(to_email)

        # if ?new=true, only emails from the last 2 hours
        if new_only:
            cutoff_ts = time.time() - 2 * 60 * 60
            cutoff_iso = time.strftime(
                "%Y-%m-%dT%H:%M:%S", time.gmtime(cutoff_ts))
            filter_expression &= Attr("timestamp").gt(cutoff_iso)

        if triage and triage != "All Emails":
            filter_expression &= Attr("triage").eq(triage)

        email_response = emails_table.scan(FilterExpression=filter_expression)
        emails = email_response.get("Items", [])

        return make_response(200, {"emails": emails}, event)

    except Exception as e:
        return make_response(500, {"message": "Internal server error", "error": str(e)}, event)


def update_reply_handler(event, context):
    body = json.loads(event["body"])
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
    try:
        body = json.loads(event["body"])
        email_id = body.get("emailId")
        timestamp = body.get("timestamp")
        new_triage = body.get("newTriage")

        if not email_id or not timestamp or not new_triage:
            return make_response(400, {"error": "Missing emailId, timestamp, or newTriage"}, event)

        allowed_triage_values = {
            "Sales", "Applications", "Spam", "Partnerships",
            "Miscellaneous", "Unsorted", "Offensive", "Flagged"
        }

        if new_triage not in allowed_triage_values:
            return make_response(400, {"error": f"Invalid triage category: {new_triage}"}, event)

        emails_table.update_item(
            Key={
                "emailId": email_id,
                "timestamp": timestamp
            },
            UpdateExpression="SET triage = :t",
            ExpressionAttributeValues={":t": new_triage},
            ConditionExpression="attribute_exists(emailId) AND attribute_exists(#ts)",
            ExpressionAttributeNames={"#ts": "timestamp"}
        )

        return make_response(200, {"message": "Triage updated successfully"}, event)

    except emails_table.meta.client.exceptions.ConditionalCheckFailedException:
        return make_response(404, {"error": "Email not found — check ID and timestamp"}, event)
    except Exception as e:
        return make_response(500, {"error": "Internal server error", "details": str(e)}, event)


def filter_handler(event, context):
    try:
        body = json.loads(event["body"])
        user_id = body.get("userID")
        natural_query = body.get("query")

        if not user_id or not natural_query:
            return make_response(400, {"error": "Missing userID or query"}, event)

        lambda_client = boto3.client("lambda")
        response = lambda_client.invoke(
            FunctionName="emailFilterHandler",
            InvocationType="RequestResponse",
            Payload=json.dumps({
                "body": json.dumps({
                    "userID": user_id,
                    "query": natural_query
                })
            })
        )

        response_payload = json.loads(response["Payload"].read().decode())
        return make_response(response_payload.get("statusCode", 500), json.loads(response_payload["body"]), event)

    except Exception as e:
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
