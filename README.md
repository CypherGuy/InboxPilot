## Inspiration

My inspiration behind InboxPilot came from how annoyed I've been managing an ever-growing inbox, which showed for me a possible demand for better email management solutions in business environments. I realised how much productivity was lost by manually categorising emails, and Gmail wasn't very useful. I then came across this hackathon and that lead me to use AWS to create a website that could intelligently interpret user queries and organize emails.

## What it does

InboxPilot lets users:

- View incoming mail in categorized tabs (Sales, Spam, Partnerships, etc..)

- View recent emails in a dedicated “Recent” tab

- Flag urgent and important messages for follow-up

- Ask natural-language questions like “All emails from john@example.com about a missing payment” and get filtered results

- Auto-reply using AWS SES and user templates

All of this is done in an entirely serverless manner.

## How i built it

- **Frontend:** Next.js 15 with React Server & Client Components, Radix UI for sidebar/scroll-area, Sonner for notifications, written in TypeScript

- **Backend:**

* AWS API Gateway for logging in/signing up users, getting emails and filtering emails

* AWS Lambda for Checking authorization for secure routes, triaging the emails and writing the API

- **Storage:**

* S3 for storing key details from incoming emails, forwarded onto DynamoDB

* DynamoDB tables for Users & Emails

- **AI Filtering:** Bedrock Runtime with Claude 3 Haiku + guardrails to map queries to filter JSON

- **Email Delivery:** AWS SES ([noreply@inboxpilot.xyz](mailto:noreply@inboxpilot.xyz)) for replies; IAM roles locked down to focus on least privilege

## Challenges I ran into

### 🔒 SES SendEmail Permissions Error

I was persistently hitting `AccessDenied` when trying to send emails. I wasn't aware at the time that you had to explicitly verify email addresses.

- **Root Cause:** Lambda role lacked the `ses:SendEmail` permission for the correct identities, despite having the correct policies attached.

- **Fix:** Granted the corret SES permissions, and more importantly, verified the sender address (`noreply@inboxpilot.xyz`). I also used the user's proxy email address in the Reply-To header to maintain personalised replies.

### 🧠 Natural Language Email Categorisation with Bedrock

I wanted users to filter emails using natural language, like "Show me all my job offers in the past 2 weeks" using Claude via Bedrock. However, Claude didn’t have access to the full email content due to SES constraints and how unscalable having it view the full email content is. Additionaly, whenever Claude was asked a question, it would often hallucinate and return invalid or irrelevant results.

- **Root Cause:** Claude could only see metadata (subject, sender, date), nothing to do with the actual email. This limited the quality of its classifications and increased the chance of ambiguous results.

- **Fix:** I refined the input prompt to clearly instruct Claude to classify based on the subject as well as the start of the email body and its headers. I also added guardrails for offensive emails and capped token limits to reduce hallucination, ensuring predictable and safe categorisation.

## Accomplishments that I'm proud of

- Seamless CORS-enabled API Gateway → Lambda integration

- Natural-language filtering via Bedrock with robust guardrails

- True serverless auto-reply pipeline using SES and DynamoDB templates

- Responsive, accessible UI with loading spinners, tabs for new/recent mail, and mobile friendliness

## What I learned

- AWS SES identity and IAM can be deceptively tricky—always verify your “From” domain

- Bedrock guardrails help ensure structured LLM output but require fallback logic

- Next.js Server Components + client hooks strike the right balance for auth and data fetching

- DynamoDB scans at scale need careful filter expressions and pagination

## What’s next for InboxPilot

- Add real-time WebSocket updates for live incoming mail

- Migrate from scan-based filtering to indexed queries for performance

- Expand NL filtering to include body content (with user opt-in)

- Introduce user preferences for custom categories and rules via a GUI

- Ship a mobile-optimized PWA version for on-the-go email triage
