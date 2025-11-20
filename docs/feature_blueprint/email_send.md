1. Scope of the Feature

This feature is part of “Send Message” in the sidebar.

The platform currently supports Email only as the message channel.

Users can send:

A single email to 1 contact, OR

The same email to many contacts, including entire groups.

Group size may be small or very large; therefore:

The system must implement a safe throttling / batching mechanism to avoid:

Rate limit issues,

API overload,

Blacklisting by SendGrid,

Slow UI responsiveness.

Examples of throttling:

Process in batches (e.g., 50–200 emails per batch).

Delay between batches (configurable).

Enqueue all emails in a background job queue.

Users must only see and send to contacts in their own organization.

2. Who Can Send Emails

Any authenticated user with access to “Send Message.”

User can only:

See contacts belonging to their organization

Send emails to contacts inside their organization

No cross-organization visibility or sending.

3. User Flow (From UI Perspective)

User clicks Send Message in the sidebar.

On the "Send Message" screen:

Channel selector shows Email as preselected.

All other channels appear disabled or “coming soon.”

User selects one or multiple contacts or chooses a contact group.

User composes the email:

Subject (required)

Body (rich text)

Attachment upload (files)

Supported file types:
PDF, JPG, PNG, DOCX, XLSX, ZIP (configurable)

Maximum total size: define limit (e.g., 10MB)

Attachments are stored temporarily and included when sending.

User may apply templates (optional).

User may insert dynamic variables (e.g., {{first_name}}).

User previews the email.

User clicks Send.

System validates, processes recipients, queues sending, and provides results.

After sending:

The email appears in an Email Sent Logs Table with:

Subject

Timestamp

Number of recipients

Sender (user who triggered the send)

Status summary (e.g., 180 sent, 20 failed)

Action → View Details

4. Recipient Requirements

User must be able to:

Search contacts by name/email

Select one or many contacts

Select an entire group

Recipients must:

Belong to the same organization as the sender.

Have a valid email address.

Have status = Active.

System must exclude automatically:

Blocked contacts

Unsubscribed contacts

Bounced contacts

Contacts with invalid email format

When exclusions happen:

Show message like:
“12 recipients removed automatically (unsubscribed or invalid emails).”

5. Compose Email Requirements
5.1 Subject & Body

Both fields are required.

Use a standard open-source or well-supported rich text editor library (e.g., Quill, TipTap, TinyMCE).

Do NOT build a custom editor from scratch.

Editor must support:

Bold, italic, underline

Bullet / numbered list

Hyperlinks

Basic HTML output

Optional image support

5.2 Attachments

User can attach one or multiple files.

Each file shows:

Filename

Size

Remove (x) icon

System must:

Validate file type

Validate file size

Upload and store temporarily

Pass these attachments to SendGrid's API

5.3 Templates (optional)

User may load predefined templates (optional for MVP).

Templates may contain variables like {{first_name}}.

5.4 Personalization Variables

Supported variables:

{{first_name}}

{{last_name}}

{{full_name}}

{{company_name}}

If a variable is missing:

Default behavior: leave it blank
(no fallback unless defined later)

6. Sending Requirements
6.1 Before Sending – Validation

When user clicks Send:

At least one valid recipient must exist.

Subject & Body must not be empty.

All contacts must belong to the user’s organization.

All attachment validations must pass.

Variables must be properly parsed.

6.2 Sending Mechanism (Using SendGrid Only)

The system must:

Use SendGrid API exclusively (remove SES/Mailgun options).

Perform batch sending with throttling:

Split recipients into batches.

Insert sending jobs into a queue (Redis/Background Worker).

Ensure SendGrid rate limits are never exceeded.

For each recipient:

Render final content with variable substitution.

Attach files.

Send via SendGrid.

Log result (accepted / failed).

7. Logging, Status Tracking & History
7.1 Immediate Feedback

After clicking Send:

Show “Sending…” indicator.

Show summary after queue insertion:

Example: “Email queued for 200 recipients.”

7.2 Per-contact Logging

Every attempted email generates an entry in the contact’s engagement history:

Date/time

Channel: Email

Subject

Initial send result (accepted or failed)

Sender user ID

7.3 Email Logs Table (New Feature)

Create an Email Logs table under “Send Message” or “Messaging → Email Logs”.

Table columns:

Email Subject

Sender (user who triggered send)

Number of recipients

Timestamp

Status (queued, sending, completed)

Action: View Details

“View Details” screen must show:

List of recipients

Per-recipient result (sent, failed)

Failure reasons (if available)

Attachments used

8. Error Handling Requirements

If SendGrid API fails:

Retry via queue with backoff.

If still failing after retries → mark as failed.

UI must show meaningful errors:

Invalid email

Organization mismatch

Rate limit issues

Attachment too large

System must never block the UI or lock up the page.

9. Compliance Requirements

Never send to:

Unsubscribed contacts

Blocked contacts

Bounced contacts

Emails must include a footer with unsubscribe instructions.

Contacts must remain private per organization.

10. Non-functional Requirements

Sending pipeline must handle:

Up to thousands of emails per batch.

High throughput with controlled throttling.

Ensure:

High availability

Idempotent sending jobs

Secure storage of SendGrid API key