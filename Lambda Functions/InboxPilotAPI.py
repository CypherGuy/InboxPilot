import bcrypt
from boto3.dynamodb.conditions import Attr
import json
import boto3
import os

SECRET_TOKEN = os.environ["AUTH_TOKEN"]  # Stored in AWS Lambda
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("Users")
emails_table = dynamodb.Table("Emails")


def register_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]
    name = body["name"]
    proxy_email = body["proxyEmail"]
    reply_template = body["replyTemplate"]
    raw_password = body["password"]

    existing = users_table.get_item(Key={"userID": user_id})
    if "Item" in existing:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "User already exists"})
        }

    hashed_pw = bcrypt.hashpw(raw_password.encode(
        'utf-8'), bcrypt.gensalt()).decode('utf-8')

    users_table.put_item(Item={
        "userID": user_id,
        "name": name,
        "proxyEmail": proxy_email,
        "replyTemplate": reply_template,
        "password": hashed_pw
    })

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "User registered successfully."})
    }


def login_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]
    raw_password = body["password"]

    # Fetch user by ID
    response = users_table.get_item(Key={"userID": user_id})

    if "Item" not in response:
        return {
            "statusCode": 401,
            "body": json.dumps({"error": "User does not exist"})
        }

    stored_user = response["Item"]
    hashed_pw = stored_user.get("password")

    if not hashed_pw:
        return {
            "statusCode": 401,
            "body": json.dumps({"error": "Password not set"})
        }

    if not bcrypt.checkpw(raw_password.encode('utf-8'), hashed_pw.encode('utf-8')):
        return {
            "statusCode": 401,
            "body": json.dumps({"error": "Incorrect password"})
        }

    stored_user.pop("password", None)

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Login successful", "user": stored_user})
    }


def reply_handler(event, context):
    try:
        body = json.loads(event["body"])
    except (TypeError, json.JSONDecodeError):
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid JSON body"})
        }

    user_id = body.get("userID")

    if not user_id:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing userID"})
        }

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" in response:
        reply = response["Item"].get(
            "replyTemplate", "Hey, Thanks for reaching out. I'll get back to you soon!")
        return {
            "statusCode": 200,
            "body": json.dumps({"reply": reply})
        }
    else:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "User not found"})
        }


def emails_handler(event, context):
    to_email = event.get("queryStringParameters", {}).get("toEmail")

    if not to_email:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing toEmail"})
        }

    email_response = emails_table.scan(
        FilterExpression=Attr("toEmail").eq(to_email)
    )

    emails = email_response.get("Items", [])

    return {
        "statusCode": 200,
        "body": json.dumps({"emails": emails})
    }


def update_reply_handler(event, context):
    body = json.loads(event["body"])
    user_id = body.get("userID")
    new_template = body.get("replyTemplate")

    if not user_id or not new_template:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing userID or replyTemplate"})
        }

    # Update the user
    users_table.update_item(
        Key={"userID": user_id},
        UpdateExpression="SET replyTemplate = :r",
        ExpressionAttributeValues={":r": new_template}
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Reply template updated"})
    }


def lambda_handler(event, context):
    print("EVENT:", json.dumps(event))
    headers = event.get("headers", {})

    method = event.get("httpMethod")
    path = event.get("path")

    if method == "POST" and path == "/register":
        return register_handler(event, context)
    elif method == "POST" and path == "/login":
        return login_handler(event, context)
    elif method == "POST" and path == "/reply":
        return reply_handler(event, context)
    elif method == "GET" and path == "/emails":
        return emails_handler(event, context)
    elif method == "POST" and path == "/update-reply":
        return update_reply_handler(event, context)
    else:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "Route not found"})
        }
