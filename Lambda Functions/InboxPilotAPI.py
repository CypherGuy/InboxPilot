from boto3.dynamodb.conditions import Attr
import json
import boto3


dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("Users")
emails_table = dynamodb.Table("Emails")


def register_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]
    name = body["name"]
    proxy_email = body["proxyEmail"]
    reply_template = body["replyTemplate"]

    users_table.put_item(Item={
        "userID": user_id,
        "name": name,
        "proxyEmail": proxy_email,
        "replyTemplate": reply_template
    })

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "User registered successfully."})
    }


def login_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]

    response = users_table.get_item(Key={"userID": user_id})

    if "Item" in response:
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Login successful", "user": response["Item"]})
        }
    else:
        return {
            "statusCode": 401,
            "body": json.dumps({"message": "Invalid credentials"})
        }


def reply_handler(event, context):
    body = json.loads(event["body"])
    user_id = body["userID"]

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
    user_id = event.get("queryStringParameters", {}).get("userID")

    if not user_id:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing userID"})
        }

    # Check if user exists
    response = users_table.get_item(Key={"userID": user_id})
    if "Item" not in response:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "User not found"})
        }

    email_response = emails_table.scan(
        FilterExpression=Attr("userID").eq(user_id)
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
    route_key = event.get("routeKey")

    if route_key == "POST /register":
        return register_handler(event, context)
    elif route_key == "POST /login":
        return login_handler(event, context)
    elif route_key == "POST /reply":
        return reply_handler(event, context)
    elif route_key == "GET /emails":
        return emails_handler(event, context)
    elif route_key == "POST /update-reply":
        return update_reply_handler(event, context)
    else:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "Route not found"})
        }
