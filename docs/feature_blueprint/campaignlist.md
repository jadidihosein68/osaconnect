Campaign List Page

1. Empty state

If the organization has no campaigns, display an illustration, a short message (“No campaigns yet”), and a primary button “Create Campaign” that routes to the Campaign Send form.

2. Card grid

Display campaigns as cards in a responsive grid (2–3 columns).

Each card shows:

Campaign Name

Channel Icon & Label (WhatsApp/Email/Telegram)

Status (Scheduled | Sending | Completed | Paused | Failed)

Date (created or scheduled start)

Target Count (contacts selected)

Sent, Delivered, Read/Open, Unsubscribed, and Failed counts (with percentages)

Cost (estimated or actual cost)

Throttle Rate (e.g. “60 msgs/min”)

View Details button

Colour coding:

Use green for delivered/read success, red for failed/unsubscribed counts, and neutral for others.

Avoid overly bright colours to keep within the existing design palette.

3. Search & Filters

Search bar to filter by campaign name (debounced).

Dropdown filters:

Channel (All | WhatsApp | Email | Telegram)

Status (All | Scheduled | Sending | Completed | Failed)

Date Range (optional).

4. Pagination

Load 12 campaigns at a time; show “Load more” button if there are more.

Future: switch to infinite scroll or a table view if campaign count grows.

5. Actions

Each card has a single action: View Details.

Additional actions (duplicate, delete) are deferred to later releases.

B. Campaign Detail Page

1. Header

Title bar with campaign name and channel icon.

Show created date, scheduled send date/time, creator’s name.

Status badge (colour-coded).

2. Summary metrics

A row of cards/tiles showing:

Sent

Delivered

Read/Open

Failed

Unsubscribed

Cost

Each tile displays the count and percentage of the target.

Tooltips explain metric definitions and limitations (e.g. “Read counts reflect opens; may undercount actual reads”).

3. Audience & template info

Section showing:

Target Group / Segment (name and size).

Whether a CSV was used.

Channel throttle (read-only).

Template Name used.

Variables used (list of placeholders).

Optionally show the rendered message preview (e.g. sample first message).

4. Charts

Simple bar or pie chart illustrating proportions of Delivered vs Failed vs Unsubscribed vs Unsent (if any).

A timeline chart can be added later to show sends per minute for long‑running campaigns.

5. Recipients breakdown (optional MVP+)

Paginated table listing contacts with their status (Sent/Delivered/Read/Failed/Unsubscribed).

Search/filter by name, status.

This table can be deferred if MVP schedule is tight.

6. Unsubscribe details

List or export of contacts who unsubscribed because of this campaign.

Show their contact ID/email/phone and channel-specific unsubscribe timestamp.

Provide link to contact detail page for more context.

7. Compliance notes

Display a note about 24‑hour reply windows for channels that require it (WhatsApp/Instagram).

Reminder that unsubscribed contacts are automatically suppressed from future campaigns.

C. Backend & API Notes

Aggregated metrics (sent, delivered, read, failed, unsubscribed, cost) must be stored in campaigns table and returned by /api/campaigns and /api/campaigns/{id}.

Throttling values are pulled from channel_settings and included in the API response.

Detail endpoint should include metadata (template name, segment/group info, created/scheduled dates) and a preview of the rendered message for the first contact.

Read/open counts rely on provider callbacks; these values update over time and the UI should refresh them periodically (e.g. via React Query polling).