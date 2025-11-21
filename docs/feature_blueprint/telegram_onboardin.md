1. Purpose

Telegram Onboarding allows an organization to link contacts in Corbi to their Telegram accounts via a secure, invite-only flow.

We only onboard users who receive an invite from Corbi (via email with deep link).

We do not support organic onboarding from people who randomly find the bot in Telegram.

Only onboarded contacts can later be used as recipients for Telegram messages.

2. Navigation / Sidebar

Under Messaging in the left sidebar:
under contact please add a new item call :

Telegram Onboarding

Clicking Telegram Onboarding loads a new page dedicated to managing Telegram onboarding for contacts.

3. Data Model Changes
3.1 Contact fields (per organization)

Add the following fields to the Contact model:

telegram_status (block, etc)
telegram_linked (on boarding is successfull)
telegram_invited (optional – when invite sent but not yet onboarded)
telegram_onboarded_at (datetime, nullable)


3.2 Telegram invite tokens table

Create a table telegram_invite_tokens to manage deep-link tokens:

id

organization_id

contact_id (should connect to our current contact list)

verification_token (string, unique, random or signed)

expires_at (datetime)

used_at (datetime, nullable)

status (enum): PENDING, USED, EXPIRED

created_at, updated_at

Each token is tied to exactly one contact and one organization.

4. Telegram Onboarding Page (UI)

When user clicks Messaging → Telegram Onboarding, show a page with:

4.1 Header

Title: Telegram Onboarding

Subtitle: Invite your contacts to connect their Telegram accounts with Corbi.

4.2 Bot Info Panel (top / sidebar card)

A small info card showing:

Bot name (read-only)

Bot status (e.g., “Connected” if token exists)

Website link used for redirect (for organic /start with no token)

(Backend: we already store bot token in DB; this page just displays bot identity, not editing it.)

4.3 Contacts table

Main table listing contacts from the current organization:

Columns:
Name
Email
Phone
Telegram Status

Chip showing: Not Linked / Invited / Onboarded / Blocked
Telegram Onboarded At (if applicable)
Last Invite Sent (derived from telegram_invite_tokens)

Actions:
Copy Invite Link
Send Invite Email

Filters:
Search box (by name or email)
Status filter: All / Not Linked / Invited / Onboarded / Blocked
Optional: Group filter (reuse groups you already have)

Rows:
Only contacts that belong to the current organization.
Contacts with telegram_status = ONBOARDED should be clearly highlighted.

5. Invite Flow (Deep Link via Email)
5.1 Generating the invite link

When user clicks “Copy Invite Link” in Actions for a contact:
Backend generates or reuses a telegram_invite_tokens record:
verification_token = secure random or signed value encoding at least contact_id + organization_id.
If an existing valid PENDING token exists, it can be reused.

Build deep link:
https://t.me/<bot_name>?start=<verification_token>

Return this URL to frontend.

Frontend:

Copies link to clipboard and shows toast:
“Telegram invite link copied for <Contact Name>.”

5.2 Sending invite email

When user clicks “Send Invite Email” in Actions:

Backend:

Generates (or reuses) a valid telegram_invite_tokens row.

Builds the deep link as above.

Composes email using an email template (e.g. “Telegram Onboarding Invite”):

To: contact email

Subject: e.g. “Connect with us on Telegram”

Body (example):

Hi {{first_name}},

You can now receive updates from {{organization_name}} via Telegram.
Click the button below to connect your Telegram account:
[Connect on Telegram] (deep link)

/////////////////////////////////////////

Sends email via existing SendGrid integration.

Marks contact telegram_status = INVITED.

Updates last invite timestamp (can be derived from telegram_invite_tokens.created_at).

6. Bot Webhook Behavior (/start with token)

When the invitee clicks the deep link, Telegram sends /start <token> to the bot.

Backend webhook must:

Extract <verification_token> from the message.

Validate token:

Exists in telegram_invite_tokens.

Status is PENDING.

expires_at is in the future.

From token, determine:

organization_id

contact_id

Confirm that:

Contact exists.

Contact belongs to organization_id.

/////////
Update contact:

telegram_chat_id = chat_id from Telegram update.

telegram_status = ONBOARDED.

telegram_onboarded_at = now().

Update token:

status = USED

used_at = now()

Send confirmation message to user in Telegram, for example:

“Hi {{first_name}}, your Telegram is now connected to {{organization_name}}.
You’ll receive important updates here.”

After this, the contact is eligible to receive Telegram messages from Send Message → Telegram (in future).

7. Behavior for Organic /start (No Token)

If someone finds the bot directly in Telegram and presses Start without any token:

Bot webhook receives /start without a valid verification token.

Backend must not attempt to match them to a contact.

Instead, reply with a redirect message, for example:

“To connect your Telegram with Corbi, please log in to your account and use the invitation link sent by email.
Visit: https://your-website.com”

No telegram_chat_id should be stored, and no contact should be created/updated in this case.

8. Eligibility & Restrictions

A contact is considered Telegram Onboarded and eligible for Telegram sending only if:

telegram_status = ONBOARDED

telegram_chat_id is not null

If Telegram later returns an error like “bot was blocked by the user”:

Set telegram_status = BLOCKED.

Do not use that contact for future Telegram sends.

All queries and updates must be scoped by organization_id.

Users must never see or onboard contacts that belong to another organization.

9. Error Handling & Edge Cases

If token is invalid, expired, or already used:

Bot should respond with:

“This Telegram invite link is invalid or has expired. Please request a new invite from your organization.”

Do not bind chat_id.

If user clicks the same link twice:

Second attempt sees token USED:

Message should say they are already connected, or ask them to request a new invite if something is wrong.

If invite email fails to send:

Show error in UI and do not update telegram_status to INVITED.




10. Non-functional Requirements

Deep-link tokens must be:

Cryptographically secure (random or HMAC/JWT).

Time-limited (expires_at).

One-time use (status = USED after successful onboarding).

Telegram Bot token is stored securely in DB/secret storage and never exposed in the UI.

Telegram Onboarding page should handle:

Pagination for large contact lists.

Filtering by status without significant performance issues.