1. Objective

Implement Instagram DM onboarding so that:

Contacts become eligible for Channel = Instagram in Messaging → Send Message only after they have initiated a DM with our Instagram Business account.

The system safely stores and links the Instagram user ID to a contact, respecting:

Meta’s “user must message first” rule

24-hour messaging window

Organization isolation

2. Prerequisites & Configuration (per Organization)

For each organization, store Instagram config in DB (not in code):

meta_app_id

meta_app_secret

instagram_access_token (long-lived page token)

instagram_business_account_id

instagram_enabled (boolean)

Rules

When processing webhooks or sending messages, backend must load these values from DB using organization_id.

If instagram_enabled = false or required fields are missing:

Do not onboard or send.

Channel “Instagram” is hidden or disabled in UI with a message:

“Instagram is not configured for this organization.”

3. Contact Model Changes

Extend the Contact entity with Instagram fields:

instagram_user_id (string; Meta’s PSID for this user)

instagram_opt_in (boolean, default false)

instagram_blocked (boolean, default false)

instagram_last_inbound_at (datetime, nullable)

instagram_last_outbound_at (datetime, nullable)

All contacts are already scoped by organization_id. Instagram fields follow the same scope.

4. Definition of “Onboarded to Instagram”

A contact is considered onboarded to Instagram (and therefore eligible in Send Message → Channel = Instagram) when all of the following are true:

The user has sent at least one DM to the organization’s Instagram Business account (any message, story reply, reaction, etc.).

The system has received and processed the corresponding Meta webhook event.

The system has:

Stored the user’s instagram_user_id on a contact for that organization.

Set instagram_opt_in = true.

Updated instagram_last_inbound_at to the event time.

Only such onboarded contacts may appear as selectable recipients under Send Message → Instagram.

5. Webhook Handling – Initial Onboarding

Meta webhook endpoint (e.g. POST /webhooks/meta/instagram) must:

Validate the request:

Verify Meta’s signature and subscription.

Extract message info:

sender_id (user Instagram ID / PSID)

recipient_id (our business account id)

message content + timestamp

Resolve organization:

Map recipient_id (business IG account) to the correct organization_id using configuration.

Link or create contact:

Try to find an existing contact in that organization with instagram_user_id = sender_id.

If found:

Use that contact.

If not found:

Best-practice option A (recommended):

If you have a known match (e.g., from prior import/CRM mapping), update that contact with instagram_user_id = sender_id.

Else create a new contact placeholder with:

Name: e.g. “Instagram User”

instagram_user_id = sender_id

instagram_opt_in = true

organization_id = resolved org

OR (if you prefer manual control) mark it as an “unlinked Instagram user” record to be matched later by an admin.
(Choose one approach and keep it consistent.)

Mark as onboarded:

Set instagram_user_id on the contact (if not already set).

Set instagram_opt_in = true.

Set instagram_blocked = false (if previously blocked and now active).

Update instagram_last_inbound_at = event_timestamp.

Log inbound message into instagram_messages (per your send-message specs).

Result: after the user’s first DM, there is a contact with instagram_user_id and instagram_opt_in = true, and they are now eligible for DM from Send Message (within 24 hours).

6. Eligibility Rules for Send Message (Instagram Channel)

When user opens Messaging → Send Message and selects Channel = Instagram:

The Contact selector must only list contacts where:

instagram_opt_in = true

instagram_user_id is not null

instagram_blocked = false

Contact belongs to current organization_id

If a contact was previously onboarded but later blocked (see below), they must not be selectable.

7. Ongoing Updates & Best Practices
7.1 24-Hour Window Tracking

Each inbound and outbound Instagram message should update:

instagram_last_inbound_at (on inbound)

instagram_last_outbound_at (on outbound)

This allows:

Checking whether the last inbound is within 24 hours when sending a free-form outbound message.

For now:

At minimum, we should warn in the UI if last inbound > 24h:

“User has not interacted in the last 24 hours. Instagram may reject this message unless it’s a template.”

Implementation of templates can be a later phase.

7.2 Blocking / Opt-Out

If Meta API returns an error indicating:

user blocked the business,

policy violation,

or messaging not allowed,

the system should:

Set instagram_blocked = true (and optionally instagram_opt_in = false).

Prevent further outbound messages to that contact via Instagram.

Contact will no longer appear as selectable for Channel = Instagram.

8. UI Impact (Aligned with Your Implementation)
8.1 Send Message – Channel Selector

Instagram appears as a channel only if:

instagram_enabled = true for current organization, and

Required config exists in DB.

8.2 Contact Selector (when Instagram is selected)

Only shows eligible onboarded Instagram contacts (see §6).

If there are zero eligible contacts:

Show info message:

“No Instagram-onboarded contacts found. A user must message your Instagram account first before you can reply from here.”

9. Non-Functional & Security Requirements

All Instagram tokens and app secrets must be stored server-side (DB or secure vault) and never exposed to frontend.

All webhook handling and sending must be scoped by organization_id.

Onboarding is idempotent:

Receiving multiple webhooks for the same user must not create duplicate contacts.

System must handle message volume gracefully; onboarding logic should be lightweight (simple DB lookups/inserts).