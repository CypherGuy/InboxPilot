import bcrypt
from boto3.dynamodb.conditions import Attr
import json
import boto3
import os
from decimal import Decimal

SECRET_TOKEN = os.environ["AUTH_TOKEN"]
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("Users")
emails_table = dynamodb.Table("Emails")

ALLOWED_ORIGIN = "*"


def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def make_response(status_code, body_dict, origin=ALLOWED_ORIGIN):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(convert_decimals(body_dict))
    }


def register_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]
    name = body["name"]
    proxy_email = body["proxyEmail"]
    reply_template = body["replyTemplate"]
    raw_password = body["password"]

    existing = users_table.get_item(Key={"userID": user_id})
    if "Item" in existing:
        return make_response(400, {"error": "User already exists"})

    hashed_pw = bcrypt.hashpw(raw_password.encode(
        'utf-8'), bcrypt.gensalt()).decode('utf-8')

    users_table.put_item(Item={
        "userID": user_id,
        "name": name,
        "proxyEmail": proxy_email,
        "replyTemplate": reply_template,
        "password": hashed_pw
    })

    return make_response(200, {"message": "User registered successfully."})


def login_handler(event, context):
    body = json.loads(event["body"])
    user_id = body.get("userID")
    raw_password = body.get("password")

    if not user_id or not raw_password:
        return make_response(400, {"message": "Missing credentials"})

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" not in response:
        return make_response(401, {"message": "Invalid credentials"})

    stored_user = response["Item"]
    hashed_pw = stored_user.get("password")

    if not hashed_pw:
        return make_response(401, {"message": "Invalid credentials"})

    password_match = bcrypt.checkpw(
        raw_password.encode('utf-8'), hashed_pw.encode('utf-8'))

    if not password_match:
        return make_response(401, {"message": "Invalid credentials"})

    stored_user.pop("password", None)
    return make_response(200, {"message": "Login successful", "user": stored_user})


def reply_handler(event, context):
    user_id = event.get("queryStringParameters", {}).get("userID")

    if not user_id:
        return make_response(400, {"error": "Missing userID"})

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" in response:
        reply = response["Item"].get(
            "replyTemplate", "Hey, Thanks for reaching out. I'll get back to you soon!")
        return make_response(200, {"reply": reply})
    else:
        return make_response(404, {"error": "User not found"})


def emails_handler(event, context):
    # Put in a try-except loop to capture sneaky errors
    try:
        to_email = event.get("queryStringParameters", {}).get("toEmail")
        triage_filter = event.get("queryStringParameters", {}).get("triage")

        if not to_email:
            return make_response(400, {"error": "Missing toEmail"})

        filter_expression = Attr("toEmail").eq(to_email)

        if triage_filter and triage_filter != "All Emails":
            filter_expression = filter_expression & Attr(
                "triage").eq(triage_filter)

        email_response = emails_table.scan(
            FilterExpression=filter_expression
        )

        emails = email_response.get("Items", [])
        return make_response(200, {"emails": emails})

    except Exception as e:
        return make_response(500, {"message": "Internal server error", "error": str(e)})


def update_reply_handler(event, context):
    body = json.loads(event["body"])
    user_id = body.get("userID")
    new_template = body.get("replyTemplate")

    if not user_id or not new_template:
        return make_response(400, {"error": "Missing userID or replyTemplate"})

    users_table.update_item(
        Key={"userID": user_id},
        UpdateExpression="SET replyTemplate = :r",
        ExpressionAttributeValues={":r": new_template}
    )

    return make_response(200, {"message": "Reply template updated"})


def lambda_handler(event, context):
    method = event.get("httpMethod")
    resource = event.get("resource")

    # Handle CORS preflight
    if method == "OPTIONS":
        return make_response(200, {"message": "CORS preflight OK"})

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
    else:
        return make_response(404, {"error": "Route not found"})
