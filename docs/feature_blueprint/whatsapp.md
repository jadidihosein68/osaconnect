1. Scope

We’re adding WhatsApp as a channel in Messaging → Send Message, similar to Telegram:

Channel options: Email, Telegram, WhatsApp.

In this phase:

1:1 conversation with individual contacts only.

No groups, no campaigns.

User can:

Select a single contact.

View full WhatsApp conversation between our WhatsApp Business (via Twilio) and that contact.

Send new messages.

See replies in the same view.

2. Twilio / WhatsApp Integration – Core Requirements
2.1 Credentials & token location (IMPORTANT)

Twilio credentials and WhatsApp config must be loaded from DB, not hard-coded.

Per organization, store at least:

twilio_account_sid

twilio_auth_token

twilio_whatsapp_from (e.g. "whatsapp:+14155238886" – Twilio WhatsApp-enabled number)

whatsapp_enabled (boolean)

Rules:

At runtime, when sending a WhatsApp message:

The system must fetch Twilio credentials from DB using the current organization_id.

Credentials MUST NOT be stored in frontend or exposed via JS.

If credentials are missing or whatsapp_enabled = false:

Channel “WhatsApp” should either be hidden or disabled with a message:

“WhatsApp is not configured for this organization.”

Twilio integration: use Twilio Programmable Messaging (WhatsApp):

Outbound: Twilio REST API:

From = organization.twilio_whatsapp_from

To = "whatsapp:" + contact_phone_number

Inbound: Twilio webhook (configured in Twilio console to point to our backend).

3. Eligibility & Mapping
3.1 Contact eligibility for WhatsApp

A contact is eligible for WhatsApp if:

Belongs to the current organization.

Has a valid phone number in E.164 format (e.g. +60123456789).

Has whatsapp_opt_in = true (boolean field on contact).

Not marked as:

whatsapp_blocked (if Twilio returns “blocked/opted out”).

Unsubscribed from WhatsApp (if we support user opt-out).

We do not need an onboarding flow like Telegram here, but we must respect opt-in.

3.2 Phone → WhatsApp mapping

We don’t need a separate whatsapp_chat_id. The mapping is:

WhatsApp identity = phone_number (E.164).

Twilio From and To fields:

From = organization.twilio_whatsapp_from

To = "whatsapp:" + contact.phone_number

Inbound messages from Twilio will contain:

From = "whatsapp:+60XXXXXXXXX"

Our backend resolves that phone number → contact via existing phone field within the organization.

4. Data Model – WhatsApp Messages

Create a simple table whatsapp_messages to store all conversations:

Fields:

id

organization_id

contact_id

direction (INBOUND or OUTBOUND)

message_type (TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, OTHER)

text (nullable)

attachments (JSON; Twilio media URLs, content-type, filename)

twilio_message_sid (string; message SID from Twilio)

status (PENDING, SENT, DELIVERED, FAILED, RECEIVED)

error_reason (nullable; for FAILED)

created_at

All records must be scoped to organization_id.

5. UI – Send Message → Channel = WhatsApp

When user opens Messaging → Send Message and selects WhatsApp:

5.1 Layout

Split page into:

Left panel – Contact selector

Right panel – Conversation + composer

5.1.1 Left panel – Contact Selector

List/contact search limited to current organization.

Only show contacts where:

whatsapp_opt_in = true

phone_number is valid.

Behavior:

Search by name, email, phone.

User selects exactly one contact.

When selected, right panel loads that contact’s WhatsApp conversation.

If no eligible contacts:

“No contacts with WhatsApp opt-in found.”

No groups, no multi-select here.

5.1.2 Right panel – Conversation View

For selected contact, show chat-style history based on whatsapp_messages:

Outbound messages (from us):

Align right.

Label as “You” or “Bot”.

Show text, timestamp, and attachment thumbs/icons.

Inbound messages (from user):

Align left.

Label as contact name or “User”.

Show text, timestamp, and attachments.

Messages sorted by created_at.

6. Sending WhatsApp Messages (Outbound)
6.1 Composer

At bottom of right panel:

Multi-line message text box.

Attachments area:

Upload button for image/document (optionally audio/video).

Each attachment appears as a chip with name and remove (x).

6.2 Validation

On Send click:

A contact must be selected.

Contact must still:

Belongs to organization.

Have whatsapp_opt_in = true.

Have valid phone number.

Message text OR attachment must be present (blank messages not allowed).

Attachments must:

Be within size limits.

Be of allowed types per Twilio/WhatsApp (image, doc, etc.).

Organization must have:

Valid Twilio credentials loaded from DB (twilio_account_sid, twilio_auth_token, twilio_whatsapp_from).

If validation fails, show specific error (“WhatsApp not configured”, “Contact has no valid phone”, “No content to send”, etc.)

6.3 Outbound sending flow (via Twilio)

Once validation passes:

Load Twilio config from DB for current organization:

account_sid

auth_token

whatsapp_from

Build Twilio payload:

From = "whatsapp:" + organization.whatsapp_from
(if stored without prefix, prefix here)

To = "whatsapp:" + contact.phone_number

Body = message text

MediaUrl = array of URLs if attachments uploaded to storage

Before calling Twilio, insert row into whatsapp_messages:

direction = OUTBOUND

text, attachments

status = PENDING

organization_id, contact_id

Call Twilio REST API (Messages endpoint).

On success:

Update twilio_message_sid

Set status = SENT

Immediately render message in conversation view.

On failure:

Set status = FAILED

Store error_reason from Twilio response.

Show user error toast: e.g. “Failed to send via WhatsApp: [reason]”.

For this 1:1 feature, you can call Twilio directly without queue, but if you prefer, you can still push to a worker queue. No throttling complexity needed here.

7. Receiving WhatsApp Messages (Inbound via Twilio Webhook)
7.1 Webhook endpoint

Configure Twilio’s WhatsApp webhook to point to:

e.g. POST /webhook/twilio/whatsapp

For each incoming message, Twilio sends:

From = "whatsapp:+60XXXXXX"

To = "whatsapp:+[our number]"

Body (text) or media fields

MessageSid

Backend workflow:

Extract phone from From (strip whatsapp:).

Find contact in DB:

Match phone_number and organization_id associated with this Twilio config.

If contact found:

Insert into whatsapp_messages:

direction = INBOUND

organization_id, contact_id

text, attachments (resolve media URLs via Twilio)

twilio_message_sid

status = RECEIVED

If no contact found:

Option A: ignore (MVP).

Option B: store with contact_id = null but do not show in UI yet.

8. Live Conversation Update

When user is viewing “Send Message → WhatsApp” with a contact selected:

The conversation view should update when new inbound messages arrive.

Implementation options:

Simple: poll /whatsapp/messages?contact_id=... every X seconds.

Advanced: WebSocket or server-sent events.

Requirement:

New inbound whatsapp_messages for the selected contact must appear at the bottom of the chat without page reload.

9. WhatsApp Content & Compliance Notes

Because you’re using Twilio WhatsApp:

There is a 24-hour session window rule for free-form messages:

The business can send free-form messages only within 24 hours from the user’s last inbound message.

Outside that window, you must use pre-approved templates.

For this MVP:

At minimum, system should:

Log created_at for inbound messages.

(Optionally) prevent or warn if sending outside 24 hours:

“This contact hasn’t messaged you for more than 24 hours; WhatsApp may require a template message.”

If you don’t enforce this programmatically now, at least design the system so it can later plug in template selection.

10. Permissions & Organization Isolation

Send Message → WhatsApp must only show:

Contacts in the user’s organization.

Conversations (whatsapp_messages) for those contacts only.

Twilio config is per organization.

A user cannot view or send WhatsApp messages using another organization’s Twilio credentials.

11. Edge Cases

Contact phone number changed:

Future sends go to new number; history still bound to contact.

User opts out/blocks:

If Twilio signals opt-out (e.g. STOP), set whatsapp_opt_in = false.

Don’t allow further sending to that contact via WhatsApp.

Bad Twilio config (wrong token/SID/from):

Immediately fail with clear error:

“Invalid WhatsApp configuration for your organization. Please contact admin.”