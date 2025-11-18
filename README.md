PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product: CORBI — Smart Digital Assistant
Version: MVP Scope

======================================================================

1. Executive Summary

Corbi is a Smart Digital Assistant that automates multi-channel communication (WhatsApp, Email, Telegram, Instagram), captures inbound messages for diagnostics, manages identities, provides AI assistance backed by a knowledge base, and automates booking workflows.

This PRD defines the complete MVP scope required to launch a functional version of Corbi.
It is technology-agnostic, but the MVP will be implemented using React (frontend) and Django (backend) in a single GitHub monorepo.
the solution must follow the best practices for both fronntend and backend using css Tailwind, 
Database would be SQllite and later we will use mySQL

This PRD supersedes all prior drafts and is the official product reference for the MVP.

2. Product Goals

Corbi should enable businesses to:

Automate outbound messages across channels.

Capture and log inbound messages for diagnostics.

Enrich contact identities automatically.

Use an AI assistant with a knowledge base to reduce manual work.

Provide visibility over messaging behavior (success, failure, callbacks).

Reduce manual repetitive tasks.

Support multiple industries with no re-architecture.

Maintain high reliability, scalability, and compliance.

3. Scope Overview (MVP)

Corbi MVP will deliver the following functional capability areas:

Outbound Messaging

Inbound Message Capture (diagnostics only)

Contact & Identity Management

AI Assistant (LLM + knowledge base)

Template & Personalization Engine

Calendar & Booking Automation

Logging & Monitoring

Error Handling & Retry

Opt-Out, Compliance, and Safety

Migration Assessment (previous workflows)

4. User Roles
4.1 Business Owner / Management

Needs automation, performance visibility, and reliability.

4.2 Staff (Admin, Sales, Operations)

Uses Corbi for outbound messaging, AI assistance, and template management.

4.3 Developer / System Admin

Implements channels, monitors logs, manages credentials, and maintains platform reliability.

5. Functional Requirements (MVP)
MODULE 1 — CONTACT & IDENTITY MANAGEMENT
5.1 Data Fields Required

Each contact must store:

Full Name

WhatsApp Phone Number

Email

Telegram Chat ID

Instagram Scoped ID (IGSID)

Status: Active, Blocked, Unsubscribed, Bounced

Segments/Categories

Notes, Tags

Metadata (created time, last updated, last inbound, last outbound)

5.2 Core Behaviors

Prevent duplicate contacts.

Inbound messages must enrich identity.

Outbound is only allowed if status = Active.

Validate identifiers before sending.

5.3 Identity Enrichment Rules

If inbound payload contains identifiers:

Update contact after validation

Prevent conflicting identity updates

MODULE 2 — OUTBOUND MESSAGING ENGINE
5.4 Shared Input Requirements

Every outbound send requires:

Contact ID

Channel (WA, Email, Telegram, IG)

Template / free-text message

Variables

Optional media

5.5 Shared Processing Pipeline

Validate contact & status

Validate destination identifier

Resolve template

Substitute variables

Apply throttling

Send API request

Store message ID

Log full request

Process callback

Update status

If template substitution fails → reject send.

5.6 Channel-Specific Requirements
WhatsApp (WA)

Supports templates, 24h session messages, media

Validate template and variables

Retry on rate limits/network errors

Do NOT retry: invalid number, blocked, policy issues

Capture status lifecycle: sent, delivered, read, failed

Email

Validate email format

Support HTML and plain text

Log full SMTP/API response

Telegram

Validate Chat ID

If API returns “bot blocked”, update contact status

No retry on 403 errors

Instagram (Transactional Only)

Validate IGSID

Only transactional tags allowed

Respect 24-hour rule

No retry on invalid tag errors

MODULE 3 — INBOUND MESSAGE CAPTURE (LOGGING ONLY)
5.7 Key Requirements

Inbound messages must:

Be received via platform webhooks

Store full content

Extract identifiers

Match or create contact

No auto-reply

No agent workflow

No customer service logic

Malformed inbound payload → log as “Invalid Payload”.

MODULE 4 — AI ASSISTANT (LLM + KNOWLEDGE BASE)
5.8 Capabilities

AI must:

Retrieve KB docs

Generate grounded responses (admin/sales/operations)

Avoid hallucination

Log prompts + outputs

Support structured responses

5.9 Processing Steps

Receive query

Retrieve relevant KB snippets

Build structured prompt

Call LLM

Validate + safety check

Log everything

Constraints:

No legal/regulatory guarantees

No unsupported claims

Must be safe and controllable

MODULE 5 — TEMPLATE & PERSONALIZATION ENGINE
5.10 Requirements

Message templates

Variables & fallback

Previews

Validate required variables

Prevent empty mandatory fields

MODULE 6 — CALENDAR & BOOKING AUTOMATION
5.11 Create Event

Validate inputs

Create booking

Store event ID

Send confirmation

5.12 Modify Event

Fetch event ID

Update booking

Log modification

5.13 Cancel Event

Delete event

Remove local record

Trigger cancellation notices

5.14 Sync Attendee Response

Update booking status

Log response

MODULE 7 — LOGGING & MONITORING
5.15 Outbound Logs

Platform

Payload

Message ID

Status

Error code

Response body

5.16 Inbound Logs

Full content

Media URL

Sender IDs

Timestamp

5.17 AI Logs

Prompt

Retrieved KB docs

Model output

5.18 Monitoring Dashboard (MVP Basic)

Metrics:

Daily sends

Failed sends

Delivery rate

Callback errors

AI failures

Booking failures

MODULE 8 — ERROR HANDLING & RETRY
5.19 Retryable

Network

Timeout

Rate limit

Retry Pattern

Retry 1

Retry 2

Retry 3

Mark failed

Non-retryable

Invalid ID

Blocked user

Policy violation

Bad template

Every failure must be logged.

MODULE 9 — OPT-OUT, COMPLIANCE & SAFETY
5.20 Opt-Out Rules

Block outbound if:

Unsubscribed

Blocked

Bounced

5.21 Detect Opt-Out Messages

“stop”, “unsubscribe”, “stop messaging me”

→ Mark Unsubscribed or flag for manual review.

5.22 Compliance Rules

WhatsApp templates only

Instagram: no marketing

IG 24-hour rule enforced

No data leaks

MODULE 10 — MIGRATION & AUDIT (PREVIOUS WORK)
5.23 Developer Deliverables

Inbound Flow Audit

Gap Analysis

Target Design

Migration Plan

Timeline

Risk Assessment

6. NON-FUNCTIONAL REQUIREMENTS
6.1 Performance

Batch send: 200–300 messages

Webhook processing <1s

6.2 Maintainability

Modular code

Clear separation by channel

Centralized AI prompt config

6.3 Security

Encrypted credentials

No PII in logs

Role-based access

6.4 Scalability

Add new channels without redesign

Horizontal scale-ready

Observability enabled

6.5 Reliability

99% uptime

Error visibility

7. OUT OF SCOPE (MVP)

Ticketing workflows

Customer-care inbox

CRM dashboards

Marketing strategy

Mobile apps

Website chat UI styling

8. TECHNICAL CONSIDERATIONS (MVP Implementation)
8.1 Tech Stack

Frontend: React

Backend: Django (Python)

8.2 Repo Structure
/repo-root
   /frontend   → React App
   /backend    → Django App

8.3 Django Admin

Must leverage built-in Django admin for:

Contacts

Templates

Logs

Bookings

8.4 Internal Implementation

Use Django REST framework

Use Celery or Django-q for async outbound jobs

Use Redis for task queue

React queries backend through REST API

9. MVP FEATURES CHECKLIST (CONFIRMED)
Included in MVP

Outbound messaging (WA, Email, Telegram, IG transactional)

Inbound message capture + logs

Identity management

Template engine + variables

AI assistant (LLM + KB)

Logging (outbound/inbound/errors)

Error handling & retry

Monitoring (basic)

Calendar automation

Opt-out detection

Media validation

AI safety checks

Future Enhancements

Template versioning

Advanced segmentation

Multi-tenant scalability

Sentiment analysis

WeChat and other channels

Analytics dashboards

Advanced audit trails

Multi-channel expansion

10. ACCEPTANCE CRITERIA

MVP is accepted when:

Outbound messaging across all channels works end-to-end.

Inbound messages are fully logged and contacts updated.

AI assistant retrieves KB and avoids hallucinations.

Calendar bookings can be created, modified, cancelled.

All templates render correctly with variables.

Error handling, retry, and compliance rules work.

Monitoring dashboard displays required metrics.

Migration audit is completed and documented.

DONE

This PRD is deploy-ready, dev-ready, and suitable for shipping to Codex, backlog creation, sprint planning, and development of Corbi MVP.

If you want, I can also produce:

Detailed API Design

Django Models & ERD

Frontend UI/UX screens

Sprint Breakdown

Developer Tasks (Jira-ready)

Post-MVP roadmap