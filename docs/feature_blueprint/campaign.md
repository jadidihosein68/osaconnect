Campaign Feature — Requirements (Markdown Version)
1. Overview

The Campaign module allows users to send bulk messages to a targeted list of contacts via supported channels (Email, WhatsApp, Telegram).
It provides:

Contact segmentation
Template-based bulk messaging
Cost estimation
Delivery analytics (sent, delivered, read, unsubscribed)
The UI behaves as we developed in /messaging/campaign.

2. Campaign Creation Requirements
2.1 Campaign Name

A free-text input.

Required.

Max length 100 characters.

3. Channel Selection

Dropdown containing available channels:

Email
WhatsApp
Telegram 
instagram 

Only channels that are enabled for the organization appear.

Changing the channel auto-filters:

Allowed templates followed by selected chanel as we have template type in our existing template

Allowed contacts (e.g., WhatsApp → only WhatsApp-onboarded users)

4. Target Audience

User can choose one of the following:

4.1 Select Contact Group

Shows all contact groups defined under the organization.

Allows selecting ONE group (campaigns are group-based).

4.2 Upload List

User may upload CSV containing: we should provide one sample CSV file so they can download 

Name

Phone / Email

Valid entries only (invalid ones excluded + warning displayed).

4.3 Automatic Filtering

Only contacts onboarded for the selected channel are included.
Example:

WhatsApp → only contacts with mobile phone
1638756579 → only contacts with 1638756579 chat_id
Email → only contacts with verified email

5. Template Selection

User must select from predefined templates for the chosen channel.

Templates support variable placeholders such as {{first_name}}.

Template preview loads on selection.

for whatsapp we only allow approved template by META (we need to have the feature on the template page in the future so we can ask meta to approve template using "/<WHATSAPP_BUSINESS_ACCOUNT_ID>/message_templates")

6. Variable Preview

Automatically shows the first 3 personalized samples:

First Name

Template applied

Must match the design in the screenshot.

7. Throttling
7.1 Throttling Settings

Throttling limits (e.g., X messages per minute) are defined system-wide by admin.

Throttling values are read-only for users and we should show in campaig page .

7.2 Throttling Display

Show throttling info label (example):

“Your organization is limited to 60 messages/minute.”

User cannot modify throttling.

8. Campaign Summary
Should display:

Target Count (auto-calculated after filtering)

Estimated Cost

Email = actual 0.0004 markup 0.001 we should maintain both in DB 

WhatsApp = $ per message (taken from DB pricing table, for now per inbound and outbound is 0.005 we should maintain actual and martkup would be 25% )

Telegram = free

Channel

Template

Schedule (Send Now, future scheduling in V2)

9. Sending the Campaign
9.1 Validation

Campaign can only start if:

Name is filled

Channel selected

Target Group or Upload provided

Template selected

Target list > 0 contacts

9.2 Start Campaign Action

When “Start Campaign” is clicked:

Lock the form (non-editable)

Queue a bulk send job

Campaign record created with:

Campaign ID

Organization ID

Channel

Template used

Total recipients

Status = “Queued”

9.3 Message Dispatch

The system processes messages in batches according to throttling limits

Each outbound message logs:

message_id

contact_id

send status (queued, sent, delivered, read, failed)

timestamp

if user close the browser or go sign off this job will not stop unless user cancel it 

10. Delivery Analytics
10.1 Metrics

Campaign analytics includes:

Metric	Description
Sent Count	How many messages were successfully sent to provider
Delivered Count	For channels supporting delivery receipts
Read Count	WhatsApp + Email (via SendGrid open rate)
Failed Count	Provider returned error (e.g., unreachable)
Unsubscribed Count	Contacts who clicked unsubscribe (Email) or typed “STOP” (WhatsApp)*

* WhatsApp unsubscribe depends on provider rules, otherwise manual opt-out.

10.2 Tracking Events Per Channel
Channel	Delivered	Read	Unsubscribe
Email	Yes	Yes (SendGrid open webhooks)	Yes
WhatsApp	Yes	Yes	Partial (if STOP keyword implemented)
Telegram	Limited	No read receipts	Manual opt-out
10.3 Dashboard Display

A Campaign Detail Page must show:

Overview stats

List of recipients

Status per contact

Read / Delivered / Unsubscribed meters

11. Storage Requirements
11.1 Tables to Create
campaigns
id  
organization_id  
name  
channel  
template_id  
target_count  
sent_count  
delivered_count  
read_count  
failed_count  
unsubscribed_count  
estimated_cost  
status  
created_at  

campaign_recipients
id  
campaign_id  
contact_id  
status (queued, sent, delivered, read, failed, unsubscribed)  
provider_message_id  
error_message  
created_at  

12. Permissions

Admin and Standard User can create campaigns.

Standard users:

Cannot modify throttling

Cannot view data from other organizations

Organization isolation enforced at DB query level.

13. Edge Cases

If template variable missing fields → show warning before sending.

Unsubscribed contacts automatically excluded.

If contact lacks channel requirements (e.g., no WhatsApp ID), skip & log.

each campain belong to one organization and can not be shared with others. 