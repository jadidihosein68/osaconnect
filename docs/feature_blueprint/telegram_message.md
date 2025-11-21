1. Scope

This feature adds Telegram chat capability inside the Send Message screen:

User can select Telegram as channel.

User can select one onboarded contact.

User can:

See the full Telegram conversation between our bot and that contact.

Send new messages via the bot.

See incoming replies from that user (via webhook) in the same conversation view.

We are not implementing:
Group sending
Campaigns


Only 1:1 chat per onboarded contact in Send Message.

2. Preconditions

A contact is considered Telegram-eligible if:

telegram_status = ONBOARDED

telegram_chat_id is not null

Contact belongs to the current organization

Contact is not marked BLOCKED / unsubscribed

Telegram onboarding (deep link + token + chat_id mapping) is assumed to already exist.

3. Navigation & Entry Point

Left sidebar: Messaging → Send Message

On this page:

There is a Channel selector.

When user selects Telegram:

The UI switches to Telegram layout.

Email-specific fields (subject, etc.) are hidden.

Group-specific features are hidden.

4. UI – Telegram Mode in “Send Message”

When Channel = Telegram is selected, the page is split into two main areas:

Left panel – Contact selection

Right panel – Conversation view + composer

4.1 Left Panel – Contact Selector

Shows a searchable list of contacts from the current organization.

Only shows contacts where:

telegram_status = ONBOARDED

telegram_chat_id is not null

Behavior:

User can search by name.

User can select exactly one contact at a time.

When a contact is selected:

Right panel loads the Telegram conversation with that contact.

If no onboarded contacts exist:

Show message like:

“No Telegram-onboarded contacts found. Please onboard contacts via Telegram Onboarding.”

Important:
No group selection here, no multi-select. This behaves like opening a chat with one user.




4.2 Right Panel – Conversation View

When a contact is selected on the left:

Show the contact’s Telegram username / name at the top.

Below that, show a chat-style conversation between:

Our bot (outbound messages)

The user (inbound messages)

Messages come from a telegram_messages store (see data model below).

Display rules:

Outbound messages (bot → user):

Align to the right.

Label as “Bot” or “Corbi”.

Show text, timestamp, attachments.

Inbound messages (user → bot):

Align to the left.

Label as contact name or “User”.

Show text, timestamp, attachments.

Messages listed in chronological order (oldest at top, newest at bottom).

Scrollable history.

Under the conversation, show a composer:

Text box (multi-line) – required.

Attachments section (optional):

Upload image / document / etc. (within Telegram limits).

Show attached files as chips with remove (x).

A Send button sends the message via Telegram to that contact.

5. Data Model (Minimal Needed for This Feature)

Create (or reuse) a table telegram_messages to store all bot-related messages per contact.

Minimum fields:

id

organization_id

contact_id

chat_id (Telegram chat_id)

direction (INBOUND or OUTBOUND)

message_type (TEXT, PHOTO, DOCUMENT, VIDEO, OTHER)

text (nullable; text or caption)

attachments (JSON; file info for photos/docs/videos)

telegram_message_id (from Telegram, optional but recommended)

created_at (timestamp)

Rules:

All inserts/queries must be scoped by organization_id.

For onboarded contacts, contact_id and chat_id must be consistent with onboarding mapping.

6. Outbound Messages (Send from UI)

When user types a message in the composer and clicks Send:

6.1 Validation

A contact must be selected.

Contact must still be Telegram-eligible:

telegram_status = ONBOARDED

telegram_chat_id not null

Message text must not be empty (after trimming).

Attachments (if any) must:

Be within Telegram size limits.

Have supported file types.

If validation fails, show appropriate error (e.g. “No contact selected”, “Message cannot be empty”, “Contact is not onboarded to Telegram anymore”).

6.2 Sending flow

Build an outbound message payload:

organization_id

contact_id

chat_id

text

attachments

message_type

Insert a new row into telegram_messages:

direction = OUTBOUND

created_at = now()

Send the message via Telegram Bot API:

sendMessage, sendPhoto, sendDocument, etc., based on attachments.

If Telegram call succeeds:

Optionally update telegram_message_id.

Immediately render the message in the conversation view (right panel).

If sending fails (e.g. bot blocked, chat not found, rate limit):

Optionally mark the message as failed (add simple status field if needed).

Show a small error in UI:

e.g. “Failed to send message: bot was blocked by user.”

No throttling/queue complexity is strictly required here if it’s single-contact chat (you can still use a queued worker internally, but this feature doesn’t require multi-thousand sends).

7. Inbound Messages (User Replies to Bot)

When the user replies to our bot in Telegram:

7.1 Webhook processing

Telegram sends an update to our webhook with:

chat_id

message_id

text and/or media

Backend resolves:

chat_id → contact_id, organization_id via onboarding data.

Insert a row into telegram_messages:

direction = INBOUND

organization_id

contact_id

chat_id

message_type

text (if any)

attachments (if any)

created_at = now()

7.2 Updating the conversation view

When the Send Message page is open and a contact is selected:

The conversation should update when new inbound messages arrive.

Implementation options:

Short polling (e.g. every X seconds – simplest).

WebSocket or server-sent events (more advanced).

Requirement:

For the selected contact, any new INBOUND rows must appear at the bottom of the chat without needing full page refresh.

8. Behavior & Rules

Single-contact chat

In Telegram mode, Send Message always operates on one contact at a time.

If user switches contact on the left panel, the right panel shows that contact’s conversation.

Only onboarded contacts

Left panel only lists contacts with:

telegram_status = ONBOARDED

telegram_chat_id not null

If contact becomes BLOCKED (future), they should disappear from the list or be clearly marked.

Organization isolation

A user must only see:

Contacts of their organization.

Conversations (telegram_messages) for those contacts only.

No cross-organization data leakage.

No extra telemetry

We are not implementing global inbound/outbound logs in this phase.

All needed visibility is via the conversation view on the Send Message page.

9. Edge Cases

If user has Send Message page open and contact is removed or loses Telegram onboarding:

Show a warning: “This contact is no longer onboarded to Telegram.”

Disable sending for that contact.

If Telegram webhook receives messages from a chat_id not mapped to any contact:

Ignore (or store separately but do not show here).

If attachments fail to upload or exceed limits:

Block sending and show user a clear error before calling Telegram.

make sure to extract telegram information from DB we have stored it in DB 

