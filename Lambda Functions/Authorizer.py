import os

SECRET_TOKEN = os.environ["AUTH_TOKEN"]


def lambda_handler(event, context):
    print("EVENT:", event)

    token = event.get("authorizationToken")
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    if token == SECRET_TOKEN:
        return generate_policy("user", "Allow", event["methodArn"])
    else:
        return generate_policy("user", "Deny", event["methodArn"])


def generate_policy(principal_id, effect, resource):
    return {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource
                }
            ]
        }
    }
