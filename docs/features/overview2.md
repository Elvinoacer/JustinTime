# JustInTime — Complete Feature Documentation

**Platform:** Kenyan Service Marketplace  
**Stack:** Next.js App Router · TypeScript · Prisma · PostgreSQL · NextAuth · Daraja STK Push · M-Pesa  
**Last Updated:** April 2026

---

## Platform Scope at a Glance

| Metric                     | Count                             |
| -------------------------- | --------------------------------- |
| App Router pages & screens | 126                               |
| API routes                 | 145                               |
| Prisma data models         | 89                                |
| Server actions modules     | 23                                |
| Supported roles            | Guest · Client · Provider · Admin |
| Supported languages        | English · Swahili · Sheng         |

---

## Table of Contents

1. [Public & Discovery Layer](#1-public--discovery-layer)
2. [Authentication & Account Lifecycle](#2-authentication--account-lifecycle)
3. [Onboarding & Role Setup](#3-onboarding--role-setup)
4. [Role Workspaces Overview](#4-role-workspaces-overview)
5. [Marketplace Core](#5-marketplace-core)
6. [Booking System](#6-booking-system)
7. [Communication & Calls](#7-communication--calls)
8. [Notifications & Alerts](#8-notifications--alerts)
9. [Trust, Safety & Verification](#9-trust-safety--verification)
10. [Financial Systems](#10-financial-systems)
11. [Invoicing & Tax Compliance](#11-invoicing--tax-compliance)
12. [Provider Business OS](#12-provider-business-os)
13. [Team & Agency Management OS](#13-team--agency-management-os)
14. [Client Workspace Features](#14-client-workspace-features)
15. [AI, Analytics & Intelligence](#15-ai-analytics--intelligence)
16. [Gamification, Badges & Loyalty](#16-gamification-badges--loyalty)
17. [Churn Prediction & Retention](#17-churn-prediction--retention)
18. [Solar & Green Tech Vertical](#18-solar--green-tech-vertical)
19. [Growth & Marketing Systems](#19-growth--marketing-systems)
20. [Admin Command Center](#20-admin-command-center)
21. [Platform Integrations](#21-platform-integrations)
22. [Internationalization & Local Context](#22-internationalization--local-context)
23. [Platform Foundations & Architecture](#23-platform-foundations--architecture)
24. [API Route Index](#24-api-route-index)
25. [Data Models Index](#25-data-models-index)

---

## 1. Public & Discovery Layer

> All features in this section are accessible to unauthenticated guests with no login required.

### 1.1 Landing & Conversion

- **1.1.0** Root landing route at `/`.
- **1.1.1** Hero landing page with service search and category entry points.
- **1.1.2** Conversion funnel pages for both service seekers and professionals.
- **1.1.3** Join/signup prompt page (`/join`) for professional acquisition.
- **1.1.4** Analytics event capture for landing page interactions (`/api/analytics/landing-events`).
- **1.1.5** Provider acquisition entry page at `/become-a-provider`.

### 1.2 Public Services Catalog

- **1.2.1** Browsable service listing page (`/services`) with category filtering.
- **1.2.2** Geolocation-aware service discovery — surfaces nearest providers first.
- **1.2.3** Service detail page (`/services/[id]`) with provider profile, pricing, and reviews.
- **1.2.4** Service interaction tracking for ranking and performance intelligence.
- **1.2.5** Category browsing via `/api/categories` — returns all categories with service counts.
- **1.2.6** Public job category discovery via `/api/jobs/categories`.

### 1.3 Public Professionals Directory

- **1.3.1** Full professionals listing page (`/professionals`) with filtering and sorting.
- **1.3.2** Professional detail profile page (`/professionals/[id]`) with stats, skills, and reviews.
- **1.3.3** Interaction tracking on professional profile views via `/api/professionals/[id]/interactions`.
- **1.3.4** Verification badge display and trust-tier signaling in discovery surfaces.

### 1.4 Public Jobs Board

- **1.4.1** Public job listings page (`/jobs`) showing open client job postings.
- **1.4.2** Job detail page (`/jobs/[id]`) with full description and proposal entry.

### 1.5 Public Content Pages

- **1.5.1** About page (`/about`).
- **1.5.2** FAQ page (`/faq`).
- **1.5.3** Blog page (`/blog`).
- **1.5.4** Contact page (`/contact`) with form submission via `/api/contact`.
- **1.5.5** Terms of Service page (`/terms`).
- **1.5.6** Privacy Policy page (`/privacy`).
- **1.5.7** Cookie Policy page (`/cookie-policy`).
- **1.5.8** Newsletter subscription via `/api/newsletter/subscribe`.
- **1.5.9** Blog post detail page at `/blog/[slug]`.

---

## 2. Authentication & Account Lifecycle

### 2.1 Authentication Methods

- **2.1.0** Dedicated login page at `/auth/login`.
- **2.1.1** Email/password authentication via NextAuth Credentials provider.
- **2.1.2** Google OAuth sign-in via `/api/auth/google-signin`.
- **2.1.3** Two-factor authentication (2FA) — token generation, confirmation, and enforcement via `TwoFactorToken` and `TwoFactorConfirmation` models.
- **2.1.4** Secure credentials verification endpoint at `/api/auth/verify-credentials`.
- **2.1.5** Session management via `Session` and `Account` Prisma models, handled by NextAuth.

### 2.2 Registration & Email Verification

- **2.2.1** Signup page and API route at `/auth/signup` / `/api/auth/signup`.
- **2.2.2** Email verification page (`/auth/verify-email`) with token-based confirmation.
- **2.2.3** Verification request page (`/auth/verify-request`).
- **2.2.4** Verify page (`/auth/verify`) for direct token handling.
- **2.2.5** Resend verification email via `/api/auth/resend-verification`.
- **2.2.6** Auth error handling page (`/auth/error`).
- **2.2.7** Admin invite acceptance page at `/auth/admin-invite` with invite redemption workflow.

### 2.3 Password Recovery

- **2.3.1** Forgot password page and API: `/auth/forgot-password` / `/api/auth/forgot-password`.
- **2.3.2** Password reset page and API: `/auth/reset-password` / `/api/auth/reset-password`.

### 2.4 Account Deletion Lifecycle

- **2.4.1** Request account deletion via `/api/account/request-deletion`.
- **2.4.2** Cancel pending deletion via `/api/account/cancel-deletion`.
- **2.4.3** Automated cleanup of scheduled deletions via `/api/account/cleanup-deletions`.
- **2.4.4** Deletion tracking persisted in the `User` model with scheduled date fields.

### 2.5 Account Settings

- **2.5.1** General settings management via `/api/settings` (GET/POST).
- **2.5.2** Password change endpoint at `/api/settings/change-password`.
- **2.5.3** User preferences stored alongside settings in the `User` model.

---

## 3. Onboarding & Role Setup

### 3.1 Unified Onboarding Shell

- **3.1.1** Multi-step onboarding entry at `/onboarding`.
- **3.1.2** Role selection step — user chooses Client or Provider.
- **3.1.3** Onboarding state tracked and persisted via `/api/users/onboarding` (POST).
- **3.1.4** Phone number validation step at `/api/users/onboarding/validate-phone`.

### 3.2 Provider Onboarding Path

- **3.2.1** Dedicated provider onboarding entry at `/provider/onboarding`.
- **3.2.2** Provider detail step — business name, service category, bio, and skills.
- **3.2.3** Identity verification step with in-browser camera capture and document upload.
- **3.2.4** Location capture step — GPS-based, with denied-location fallback handling.
- **3.2.5** Onboarding fee payment initiation integrated directly in the flow via `/api/onboarding-fee/initiate`.
- **3.2.6** Onboarding completion handoff to the Provider dashboard at `/dashboard/onboarding-complete`.
- **3.2.7** Provider setup workspace at `/provider/setup`.
- **3.2.8** Provider setup checklist at `/provider/setup/checklist`.

### 3.3 Client Onboarding Path

- **3.3.1** Dedicated client onboarding entry at `/client/onboarding`.
- **3.3.2** Client detail step — name, location, and preferences.
- **3.3.3** Location capture with GPS and manual fallback.
- **3.3.4** Completion redirect to Client dashboard.

---

## 4. Role Workspaces Overview

### 4.1 Client Workspace Pages

`/client/dashboard` · `/client/jobs` · `/client/jobs/[id]` · `/client/proposals` · `/client/bookings` · `/client/messages` · `/client/notifications` · `/client/wallet` · `/client/wallet/topup-complete` · `/client/analytics` · `/client/referral` · `/client/profile` · `/client/settings` · `/client/post-job` · `/client/reviews/submit/[bookingId]` · `/client/solar/projects` · `/client/solar/projects/[id]`

### 4.2 Provider Workspace Pages

`/dashboard` · `/dashboard/services` · `/dashboard/jobs` · `/dashboard/requests` · `/dashboard/bookings` · `/dashboard/earnings` · `/dashboard/analytics` · `/dashboard/availability` · `/dashboard/invoices` · `/dashboard/settings/tax` · `/dashboard/settings/notifications` · `/dashboard/verification` · `/dashboard/premium` · `/dashboard/premium/complete` · `/dashboard/expenses` · `/dashboard/wallet` · `/dashboard/wallet/topup-complete` · `/dashboard/loyalty` · `/dashboard/team` · `/dashboard/team/settings` · `/dashboard/team/jobs` · `/dashboard/team/members` · `/dashboard/team/payroll` · `/dashboard/team/[teamId]` · `/dashboard/team/[teamId]/jobs` · `/dashboard/team/[teamId]/members` · `/dashboard/team/[teamId]/payroll` · `/dashboard/team/[teamId]/settings` · `/dashboard/safety` · `/dashboard/reviews` · `/dashboard/messages` · `/dashboard/notifications` · `/dashboard/profile` · `/dashboard/settings` · `/dashboard/help` · `/dashboard/help/tickets/[id]` · `/dashboard/achievements` · `/dashboard/surge-pricing-demo` · `/dashboard/solar` · `/dashboard/solar/certifications` · `/dashboard/solar/config` · `/dashboard/solar/projects` · `/dashboard/solar/projects/[id]` · `/dashboard/solar/templates` · `/dashboard/verticals/solar/apply` · `/dashboard/verticals/solar/projects` · `/dashboard/verticals/solar/projects/[id]`

### 4.3 Admin Workspace Pages

`/admin` · `/admin/login` · `/admin/dashboard` · `/admin/users` · `/admin/users/[id]` · `/admin/bookings` · `/admin/jobs` · `/admin/jobs/[id]` · `/admin/disputes` · `/admin/finance` · `/admin/verifications` · `/admin/support` · `/admin/logs` · `/admin/settings` · `/admin/churn-analysis` · `/admin/marketing/promos` · `/admin/marketing/events` · `/admin/marketing/newsletter` · `/admin/reconciliation` · `/admin/reconciliation/payment-intents` · `/admin/safety` · `/admin/trust` · `/admin/insurance`

---

## 5. Marketplace Core

### 5.1 Services Marketplace

- **5.1.1** Provider service creation and management via `/api/provider/services` and the `/dashboard/services` page.
- **5.1.2** Full service CRUD — create, read, update, delete offerings.
- **5.1.3** Service video support (stored via dedicated column in schema).
- **5.1.4** Category-tagged services with filterable public discovery.
- **5.1.5** Service promotion — providers can pay to boost visibility.
- **5.1.6** Interaction analytics on service pages (`/api/services/[id]/interactions`).
- **5.1.7** Provider per-service detail management via `/api/provider/services/[id]`.
- **5.1.8** Service interaction deduplication safeguards via `ServiceInteractionDedup`.

### 5.2 Professionals Marketplace

- **5.2.1** Provider profile management via `/api/provider/profile` (GET/PATCH).
- **5.2.2** Portfolio links on professional profiles.
- **5.2.3** Skill tags and experience display on public profile pages.
- **5.2.4** Review and rating aggregates surfaced on professional listings.

### 5.3 Jobs & Proposals

- **5.3.1** Client job posting via `/client/post-job` and `/api/client/jobs` (POST).
- **5.3.2** Job lifecycle management — open, in-progress, completed, cancelled states.
- **5.3.3** Job SLA monitoring via the internal cron endpoint `/api/internal/jobs/sla-monitor`.
- **5.3.4** Job timeline events tracked via `JobTimelineEvent` model and `/api/jobs/[id]/timeline`.
- **5.3.5** Analytics event capture on job interactions via `/api/analytics/jobs-events`.
- **5.3.6** Provider proposal submission via `/api/proposals` (POST).
- **5.3.7** Proposal detail management at `/api/proposals/[id]` (GET/PATCH/DELETE).
- **5.3.8** Proposal status history tracked via `ProposalStatusHistory` model.
- **5.3.9** Reusable proposal templates — create and manage at `/api/proposals/templates` and `/api/proposals/templates/[id]`.
- **5.3.10** Proposal pipeline visible to client via `/api/jobs/[id]/proposals`.
- **5.3.11** Individual proposal accept/reject at `/api/jobs/[id]/proposals/[proposalId]`.
- **5.3.12** Provider view of active jobs at `/api/provider/jobs`.
- **5.3.13** Admin view of all jobs at `/admin/jobs` and `/admin/jobs/[id]`.

### 5.4 Booking Negotiation

- **5.4.1** Pre-booking negotiation object model backed by `BookingNegotiation`.
- **5.4.2** Negotiation creation and retrieval via `/api/negotiations` (GET/POST).
- **5.4.3** Per-negotiation detail management at `/api/negotiations/[id]` (GET/PATCH).
- **5.4.4** Negotiation components embedded in the booking form flow.

---

## 6. Booking System

### 6.1 Booking Creation & Flow

- **6.1.1** Full multi-step booking form at `/booking` — service selection, date/time, location, negotiation, and summary.
- **6.1.2** Booking creation via `/api/bookings` (POST).
- **6.1.3** Booking detail retrieval at `/api/bookings/[id]`.
- **6.1.4** Booking lifecycle events tracked via `BookingLifecycleEvent` model and `/api/bookings/[id]/timeline`.
- **6.1.5** Escrow milestone support via `/api/bookings/[id]/escrow/milestones`.
- **6.1.6** Booking quote generation via `/api/bookings/quote`.

### 6.2 Booking Management

- **6.2.1** Provider booking acceptance at `/api/bookings/[id]/accept`.
- **6.2.2** Provider booking rejection at `/api/bookings/[id]/reject`.
- **6.2.3** Booking cancellation with policy engine integration via `cancellation.ts` server action.
- **6.2.4** Booking slot and availability-aware scheduling backed by `BookingSlot` model.
- **6.2.5** Provider view of incoming requests at `/api/provider/requests` and `/dashboard/requests`.
- **6.2.6** Provider bookings list at `/api/provider/bookings`.
- **6.2.7** Client bookings list at `/client/bookings`.
- **6.2.8** Admin bookings overview at `/admin/bookings`.
- **6.2.9** Booking completion confirmation endpoint at `/api/bookings/[id]/confirm-completion`.

### 6.3 Booking Invoice

- **6.3.1** Per-booking invoice page at `/bookings/[id]/invoice`.
- **6.3.2** Invoice generation tied to booking completion.

### 6.4 Dispute Filing

- **6.4.1** Dispute submission directly from a booking context via `/api/bookings/[id]/dispute`.
- **6.4.2** Dispute model persisted and routed to admin review queue.

### 6.5 Pricing & Quote Engine

- **6.5.1** Quote generation endpoint for pre-booking cost estimation at `/api/bookings/quote`.
- **6.5.2** Quote persistence and replay support via `PricingQuote`.
- **6.5.3** Quote-to-booking handoff integrated into booking creation and negotiation workflows.

---

## 7. Communication & Calls

### 7.1 In-App Messaging

- **7.1.1** Real-time chat with Socket.IO integration.
- **7.1.2** Conversation listing via `/api/messages/conversations`.
- **7.1.3** Full message history with a user at `/api/messages/history/[otherUserId]`.
- **7.1.4** Send message via `/api/messages/send`.
- **7.1.5** Contact list for frequent conversations at `/api/messages/contacts`.
- **7.1.6** Per-message management (edit/delete) at `/api/messages/[messageId]`.
- **7.1.7** Clear full conversation with a user at `/api/messages/clear/[otherUserId]`.
- **7.1.8** Message reporting model backed by `MessageReport`.
- **7.1.9** Provider messages page at `/dashboard/messages`.
- **7.1.10** Client messages page at `/client/messages`.
- **7.1.11** Message delivery acknowledgement endpoint at `/api/messages/delivered`.
- **7.1.12** Message read receipt endpoint at `/api/messages/read`.
- **7.1.13** Recent contacts optimization endpoint at `/api/messages/recent-contacts`.
- **7.1.14** Conversation read-state and sync tracking via `MessageConversationState`.

### 7.2 Calls

- **7.2.1** Secure call initiation via the `calls.ts` server action.
- **7.2.2** Call history retrieval and lifecycle logging.
- **7.2.3** Call status tracking from initiation to completion backed by the `Call` model.
- **7.2.4** Communication components for call overlay and video call interface.
- **7.2.5** Proxy session support for masked communication via the `ProxySession` model.
- **7.2.6** Call liveness heartbeat endpoint at `/api/calls/heartbeat`.
- **7.2.7** Stale call cleanup endpoint at `/api/calls/sweep-stale`.

### 7.3 WhatsApp Integration

- **7.3.1** WhatsApp webhook endpoint at `/api/webhooks/whatsapp` for incoming event handling.
- **7.3.2** WhatsApp service integration module in `communication.ts` server action.
- **7.3.3** n8n workflow integration for multi-channel language switching (`/api/integrations/n8n/language-switch`).
- **7.3.4** Debug route for n8n webhook testing at `/api/integrations/n8n/language-switch/debug`.

---

## 8. Notifications & Alerts

- **8.1** Notification listing and read-state management at `/api/notifications`.
- **8.2** Mark all notifications as read at `/api/notifications/mark-all-read`.
- **8.3** Per-notification update and delete at `/api/notifications/[id]`.
- **8.4** FCM push token storage at `/api/notifications/store-token`.
- **8.5** Notification center pages in both Provider (`/dashboard/notifications`) and Client (`/client/notifications`) workspaces.
- **8.6** Admin notification debug and delivery test endpoint at `/api/admin/debug-notifications`.
- **8.7** Notification outbox processing pipeline via `/api/internal/notifications/outbox/process`.
- **8.8** Persistent outbox queue model for deferred delivery via `NotificationOutbox`.
- **8.9** Delivery attempt and outcome tracking via `NotificationDelivery`.
- **8.10** Delivery observability across queued, sent, failed, and retried notification states.

---

## 9. Trust, Safety & Verification

### 9.1 Identity Verification

- **9.1.1** Camera-based document capture embedded in onboarding flow.
- **9.1.2** Verification badge request and status lifecycle at `/dashboard/verification`.
- **9.1.3** Background check submission tracked via `BackgroundCheck` model.
- **9.1.4** Admin approve/revoke decisions for provider verifications.
- **9.1.5** Verification audit history backed by `VerificationAudit` model.
- **9.1.6** Verification actions via `verification.ts` server action.
- **9.1.7** Verification request lifecycle persistence via `IdentityVerificationRequest`.

### 9.2 Trust-as-a-Service (TaaS)

- **9.2.1** Weighted trust score engine backed by `TrustScore` model.
- **9.2.2** Tier progression model — Unverified → Basic → Verified → Elite.
- **9.2.3** Verification badge model with active/expired/revoked states (`VerificationBadge`).
- **9.2.4** Premium pricing eligibility tied to trust tier state.
- **9.2.5** Automated badge sync and validity checks via `taas.ts` server action.
- **9.2.6** Dedicated trust governance workspace for admin operations at `/admin/trust`.

### 9.3 Safety Operations

- **9.3.1** Panic/SOS alert trigger via `safety.ts` server action and `SOSAlert` model.
- **9.3.2** Active SOS alert retrieval and display.
- **9.3.3** SOS cancel operation.
- **9.3.4** Trusted contacts management — add, remove, list via `TrustedContact` model.
- **9.3.5** User blocking backed by `BlockedUser` model.
- **9.3.6** Safety dashboard at `/dashboard/safety`.
- **9.3.7** Dedicated safety governance workspace for admin operations at `/admin/safety`.

### 9.4 Reviews & Dispute Resolution

- **9.4.1** Review submission via `/api/reviews` and `/client/reviews/submit/[bookingId]`.
- **9.4.2** Provider review listing at `/api/provider/reviews`.
- **9.4.3** Structured dispute model linked to bookings.
- **9.4.4** Admin dispute management center at `/admin/disputes`.
- **9.4.5** Dispute resolution actions with refund preview capability.

### 9.5 Insurance & Risk

- **9.5.1** Insurance claim submission backed by `InsuranceClaim` model.
- **9.5.2** Claim retrieval and management via `insurance.ts` server action.
- **9.5.3** Claims linked to specific bookings and users for audit trail.
- **9.5.4** Dedicated insurance governance workspace for admin operations at `/admin/insurance`.

---

## 10. Financial Systems

### 10.1 Wallet

- **10.1.1** Wallet overview page at `/wallet`.
- **10.1.2** Current balance endpoint at `/api/wallet/balance`.
- **10.1.3** Financial transaction history at `/api/wallet/transactions`.
- **10.1.4** Wallet top-up initiation at `/api/wallet/topup`.
- **10.1.5** Top-up verification at `/api/wallet/verify`.
- **10.1.6** Daraja STK Push webhook processing for settlement at `/api/wallet/webhook`.
- **10.1.7** Top-up completion page at `/dashboard/wallet/topup-complete`.
- **10.1.8** Client wallet page at `/client/wallet`.
- **10.1.9** Wallet and transaction models: `Wallet`, `Transaction`, `Payment`.
- **10.1.10** Unified wallet route handler at `/api/wallet`.
- **10.1.11** Wallet top-up status polling endpoint at `/api/wallet/topup/status`.
- **10.1.12** Secret-scoped wallet webhook variant at `/api/wallet/webhook/[secret]`.
- **10.1.13** Additional wallet UX surfaces at `/dashboard/wallet` and `/client/wallet/topup-complete`.
- **10.1.14** Wallet top-up orchestration model: `WalletTopUp`.

### 10.2 Provider Earnings

- **10.2.1** Earnings detail API at `/api/provider/earnings`.
- **10.2.2** Earnings chart data for visualization at `/api/provider/earnings/chart`.
- **10.2.3** Earnings dashboard page at `/dashboard/earnings`.
- **10.2.4** Provider performance stats at `/api/provider/stats`.

### 10.3 Onboarding Fee

- **10.3.1** Onboarding fee payment initiation at `/api/onboarding-fee/initiate`.
- **10.3.2** Webhook reconciliation for fee payment status at `/api/onboarding-fee/webhook`.
- **10.3.3** Admin fee waiver action for specific providers at `/api/admin/users/[id]/waive-fee`.
- **10.3.4** Onboarding fee status polling endpoint at `/api/onboarding-fee/status`.
- **10.3.5** Secret-scoped onboarding webhook variant at `/api/onboarding-fee/webhook/[secret]`.

### 10.4 Subscriptions & Plans

- **10.4.1** Subscription initiation for PRO/BUSINESS plan upgrades at `/api/subscription/initiate`.
- **10.4.2** Subscription status check at `/api/subscription/status`.
- **10.4.3** Subscription renewal and state sync webhook at `/api/subscription/webhook`.
- **10.4.4** Premium settings and plan display at `/dashboard/premium`.
- **10.4.5** Plan and user-role update support in admin and server action layer.
- **10.4.6** Subscription model: `Subscription`.
- **10.4.7** Secret-scoped subscription webhook variant at `/api/subscription/webhook/[secret]`.
- **10.4.8** Subscription payment completion page at `/dashboard/premium/complete`.

### 10.5 Promo Codes

- **10.5.1** Promo code creation and validation via `promo.ts` server action.
- **10.5.2** `PromoCode` model integrated with booking and payment economics.
- **10.5.3** Admin promo management module at `/admin/marketing/promos`.

### 10.6 Revenue Actions

- **10.6.1** Service promotion payment via `revenue.ts` server action.
- **10.6.2** Credit purchase flows and transaction list components.
- **10.6.3** Financial reconciliation overview at `/admin/reconciliation`.

### 10.7 Payment Intent & Reconciliation Architecture

- **10.7.1** Payment intent orchestration for STK-initiated flows via `PaymentIntent`.
- **10.7.2** Durable webhook receipt persistence for replay/reconciliation via `PaymentWebhookReceipt`.
- **10.7.3** Internal receipt processing and reconciliation jobs via `/api/internal/cron/process-daraja-webhook-receipts` and `/api/internal/cron/reconcile-daraja-payments`.
- **10.7.4** Cross-flow status polling endpoints for wallet, onboarding fee, and subscriptions.
- **10.7.5** Unified verification UX surface at `/payment/verify`.
- **10.7.6** Payment intent administration and reconciliation tooling via `/admin/reconciliation/payment-intents` and `/api/admin/reconciliation/payment-intents`.

---

## 11. Invoicing & Tax Compliance

### 11.1 Invoicing

- **11.1.1** Invoice generation per completed booking.
- **11.1.2** Invoice listing at `/dashboard/invoices`.
- **11.1.3** Invoice history, stats, and detail retrieval via `invoice.ts` server action.
- **11.1.4** Retry submission for failed invoice workflows.
- **11.1.5** Tax breakdown and fiscal reporting components in the invoice view.
- **11.1.6** Invoice model: `Invoice`.

### 11.2 Tax Settings & Compliance

- **11.2.1** Tax settings page at `/dashboard/settings/tax`.
- **11.2.2** Tax settings update actions via `tax-settings.ts` server action.
- **11.2.3** Tax settings model: `TaxSettings`.

### 11.3 KRA & eTIMS Integration

- **11.3.1** KRA PIN verification and persistence backed by Gava integration utilities.
- **11.3.2** Tax compliance status retrieval.
- **11.3.3** NIL return filing action via `tax.ts` server action.
- **11.3.4** eTIMS submission model: `ETIMSSubmission`.
- **11.3.5** eTIMS service integration for KRA-compliant invoice generation per transaction.
- **11.3.6** Tax filing model: `TaxFiling`.
- **11.3.7** VAT and excise duty tax calculator modules.

### 11.4 Financial Reporting

- **11.4.1** `reporting.ts` server action for provider-side financial exports.
- **11.4.2** Admin finance summary and governance at `/admin/finance`.

---

## 12. Provider Business OS

### 12.1 Profile & Activity

- **12.1.1** Provider profile management at `/dashboard/profile` and `/api/provider/profile`.
- **12.1.2** Provider activity stream at `/api/provider/activities`.
- **12.1.3** Portfolio links management.
- **12.1.4** Provider stats dashboard at `/api/provider/stats`.
- **12.1.5** Provider activation endpoint for workspace enablement at `/api/provider/activate`.

### 12.2 Availability & Scheduling Engine

- **12.2.1** Weekly availability configuration at `/api/provider/availability` (GET/POST) and `/dashboard/availability`.
- **12.2.2** Availability exception handling for one-off overrides via `/api/provider/availability/exceptions`.
- **12.2.3** Monthly availability calendar retrieval at `/api/provider/availability/month`.
- **12.2.4** Slot conflict validation at `/api/provider/availability/check`.
- **12.2.5** Availability and exception models: `Availability`, `AvailabilityException`.

### 12.3 Expense Intelligence

- **12.3.1** Expense creation, retrieval, and deletion via `expenses.ts` server action.
- **12.3.2** Receipt scan for automated spend capture.
- **12.3.3** Expense dashboard at `/dashboard/expenses`.
- **12.3.4** Expense model: `Expense`.
- **12.3.5** Job-linked expense retrieval endpoint at `/api/provider/expenses/jobs`.

### 12.4 Dynamic Pricing

- **12.4.1** Pricing engine modules for dynamic rate calculation.
- **12.4.2** Surge pricing simulation page at `/dashboard/surge-pricing-demo`.
- **12.4.3** Surge pricing components integrated with the booking and service layers.

### 12.5 Achievements

- **12.5.1** Achievements page at `/dashboard/achievements` showing badge and milestone progress.

### 12.6 Help & Support

- **12.6.1** Help page at `/dashboard/help`.
- **12.6.2** Support ticket creation and updates via `/api/support/tickets`.
- **12.6.3** Per-ticket detail management at `/api/support/tickets/[id]`.
- **12.6.4** Provider ticket detail workspace at `/dashboard/help/tickets/[id]`.

---

## 13. Team & Agency Management OS

### 13.1 Team Structure

- **13.1.1** Team creation via `team.ts` / `teams.ts` server actions.
- **13.1.2** Team dashboard at `/dashboard/team`.
- **13.1.3** Team listing via `/api/provider/teams`.
- **13.1.4** Team model: `Team`.

### 13.2 Member Management

- **13.2.1** Member invitation and direct add/remove operations.
- **13.2.2** Member role and permission updates.
- **13.2.3** Member status and location updates.
- **13.2.4** Team members page at `/dashboard/team/members`.
- **13.2.5** Team member model: `TeamMember`.

### 13.3 Job Dispatch

- **13.3.1** Team jobs module at `/dashboard/team/jobs`.
- **13.3.2** Assign members to specific jobs with assignment tracking.
- **13.3.3** Team job status updates and progress operations.
- **13.3.4** Daily job and collection retrieval actions.
- **13.3.5** Team job models: `TeamJob`, `TeamJobAssignment`.

### 13.4 Team Earnings & Payroll

- **13.4.1** Earnings split calculation across team members.
- **13.4.2** Member balance retrieval.
- **13.4.3** Payroll generation and processing actions.
- **13.4.4** Pending payroll retrieval and payout history.
- **13.4.5** Payroll page at `/dashboard/team/payroll`.
- **13.4.6** Team payroll models: `TeamEarning`, `TeamPayroll`.

### 13.5 Team Communication

- **13.5.1** Team announcement broadcasting backed by `TeamAnnouncement` model.
- **13.5.2** Team-centric UI cards in the team dashboard.

### 13.6 Team Invitation Lifecycle

- **13.6.1** Team invitation issuance and pending-state management via `TeamInvitation`.
- **13.6.2** Invite status lifecycle tracking for acceptance, expiry, and cancellation.

### 13.7 Team Detail Workspaces

- **13.7.1** Team detail hub at `/dashboard/team/[teamId]`.
- **13.7.2** Team-scoped jobs at `/dashboard/team/[teamId]/jobs`.
- **13.7.3** Team-scoped members at `/dashboard/team/[teamId]/members`.
- **13.7.4** Team-scoped payroll at `/dashboard/team/[teamId]/payroll`.
- **13.7.5** Team-scoped settings at `/dashboard/team/[teamId]/settings` and `/dashboard/team/settings`.

---

## 14. Client Workspace Features

### 14.1 Dashboard & Activity

- **14.1.1** Client dashboard at `/client/dashboard`.
- **14.1.2** Dashboard stats (total spend, job counts) via `/api/client/dashboard/stats`.
- **14.1.3** Recent activity feed via `/api/client/dashboard/activity`.

### 14.2 Job Management

- **14.2.1** Job posting interface at `/client/post-job`.
- **14.2.2** Client jobs list at `/client/jobs`.
- **14.2.3** Job detail view at `/client/jobs/[id]`.
- **14.2.4** Client job detail API at `/api/client/jobs/[id]`.
- **14.2.5** Client job proposals listing at `/api/client/jobs/[id]/proposals`.
- **14.2.6** Client per-proposal decision endpoint at `/api/client/jobs/[id]/proposals/[proposalId]`.

### 14.3 Proposals & Bookings

- **14.3.1** Received proposals overview at `/client/proposals`.
- **14.3.2** Client bookings history at `/client/bookings`.
- **14.3.3** Post-service review submission at `/client/reviews/submit/[bookingId]`.
- **14.3.4** Client booking detail endpoint at `/api/client/bookings/[id]`.

### 14.4 Analytics & Referral

- **14.4.1** Client analytics overview at `/api/client/analytics/overview`.
- **14.4.2** Spending trend analytics at `/api/client/analytics/trends`.
- **14.4.3** Analytics dashboard page at `/client/analytics`.
- **14.4.4** Referral program — stats and referral codes at `/api/client/referral` and `/client/referral`.
- **14.4.5** Referral model: `Referral`.

### 14.5 Profile & Settings

- **14.5.1** Client profile management at `/client/profile` and `/api/client/profile`.
- **14.5.2** Client settings page at `/client/settings`.
- **14.5.3** Client settings API endpoint at `/api/client/settings`.

### 14.6 Wallet & Solar Project Workspaces

- **14.6.1** Client wallet top-up completion workspace at `/client/wallet/topup-complete`.
- **14.6.2** Client solar projects listing at `/client/solar/projects`.
- **14.6.3** Client solar project detail workspace at `/client/solar/projects/[id]`.

---

## 15. AI, Analytics & Intelligence

### 15.1 Matching & Recommendations

- **15.1.1** Recommendation hooks for personalized service and professional suggestions.
- **15.1.2** Geolocation utilities for nearest-provider relevance ranking.
- **15.1.3** Search normalization utility for local language query patterns.
- **15.1.4** Service recommendation API at `/api/recommendations/services`.
- **15.1.5** Professional recommendation API at `/api/recommendations/professionals`.
- **15.1.6** Job recommendation API at `/api/recommendations/jobs`.

### 15.2 Provider Benchmarking & Performance

- **15.2.1** Provider analytics dashboard at `/dashboard/analytics`.
- **15.2.2** Earnings trend visualization from `/api/provider/earnings/chart`.
- **15.2.3** Review aggregation for reputation intelligence.

### 15.3 User Location Intelligence

- **15.3.1** User GPS location update via `/api/user/location`.
- **15.3.2** Location data used for proximity-based discovery and dispatch.
- **15.3.3** Location lookup endpoint for geocoding/reverse lookup flows at `/api/location/lookup`.

### 15.4 Workspace Routing Intelligence

- **15.4.1** User workspace resolution endpoint at `/api/user/workspace`.

---

## 16. Gamification, Badges & Loyalty

### 16.1 Badge System

- **16.1.1** Badge definitions and automatic checker modules via `gamification.ts` server action.
- **16.1.2** Badge progress tracking and sync actions.
- **16.1.3** Badge award endpoint at `/api/badges/check`.
- **16.1.4** User badge listing at `/api/badges`.
- **16.1.5** Achievements display page at `/dashboard/achievements`.
- **16.1.6** Badge models: `Badge`, `UserBadge`.

### 16.2 Loyalty Points

- **16.2.1** Loyalty point accrual and transaction tracking via `loyalty.ts` server action.
- **16.2.2** Leaderboard support for competitive engagement.
- **16.2.3** Loyalty models: `UserLoyalty`, `LoyaltyPointTransaction`.

### 16.3 Partner Rewards

- **16.3.1** Partner ecosystem with reward definitions.
- **16.3.2** Reward redemption flow and history.
- **16.3.3** Partner ecosystem seeding action.
- **16.3.4** Partner models: `Partner`, `PartnerReward`, `RewardRedemption`.
- **16.3.5** Reward redemption validation endpoint at `/api/rewards/redemptions/validate`.
- **16.3.6** Reward redemption consumption endpoint at `/api/rewards/redemptions/consume`.

---

## 17. Churn Prediction & Retention

- **17.1** Churn score model per user backed by `ChurnScore`.
- **17.2** Intervention model for targeted re-engagement: `ChurnIntervention`.
- **17.3** At-risk user identification and retrieval via `churn.ts` server action.
- **17.4** Intervention creation and user re-engagement trigger actions.
- **17.5** Admin churn analysis workspace at `/admin/churn-analysis`.

---

## 18. Solar & Green Tech Vertical

### 18.1 Discovery & Estimation

- **18.1.1** Dedicated solar landing page at `/solar`.
- **18.1.2** Multi-step solar estimate wizard at `/solar/estimate`.
- **18.1.3** Quick estimate and detailed estimate actions via `solar.ts` server action.
- **18.1.4** Estimation calculator library for system sizing and ROI-style outputs.
- **18.1.5** Solar estimation configuration model: `SolarEstimationConfig`.
- **18.1.6** Public solar installer discovery page at `/solar/installers`.

### 18.2 Specialist Management

- **18.2.1** Solar specialist registration action.
- **18.2.2** Vertical certification submission workflow backed by `VerticalCertification`.
- **18.2.3** Featured solar specialist retrieval action.
- **18.2.4** Vertical availability retrieval action.
- **18.2.5** Vertical specialist model: `VerticalSpecialist`.

### 18.3 Project Lifecycle

- **18.3.1** Solar quote request action.
- **18.3.2** Project and milestone models: `VerticalProject`, `ProjectMilestone`.
- **18.3.3** Project status update actions.
- **18.3.4** Equipment registry and project template models: `EquipmentRegistry`, `ProjectTemplate`.
- **18.3.5** Vertical category model: `VerticalCategory`.

### 18.4 Operational Solar Workspaces

- **18.4.1** Provider solar control center at `/dashboard/solar`.
- **18.4.2** Solar certifications workspace at `/dashboard/solar/certifications`.
- **18.4.3** Solar configuration workspace at `/dashboard/solar/config`.
- **18.4.4** Solar project management at `/dashboard/solar/projects` and `/dashboard/solar/projects/[id]`.
- **18.4.5** Solar template management at `/dashboard/solar/templates`.
- **18.4.6** Vertical solar application workspace at `/dashboard/verticals/solar/apply`.
- **18.4.7** Vertical solar project workspaces at `/dashboard/verticals/solar/projects` and `/dashboard/verticals/solar/projects/[id]`.

---

## 19. Growth & Marketing Systems

- **19.1** Contact form ingestion at `/api/contact`.
- **19.2** Newsletter subscription at `/api/newsletter/subscribe` with `NewsletterSubscriber` model.
- **19.3** Referral program with client-facing page and API.
- **19.4** Promo code engine with admin management at `/admin/marketing/promos`.
- **19.5** Landing and job analytics event capture for funnel analysis.
- **19.6** Newsletter confirmation and unsubscribe flows via `/api/newsletter/confirm` and `/api/newsletter/unsubscribe`.
- **19.7** Marketing event logging and attribution persistence via `MarketingEventLog`.
- **19.8** Marketing analytics workspaces at `/admin/marketing/events` and `/admin/marketing/newsletter`.
- **19.9** Marketing event export and STK payment telemetry summary via `/api/admin/marketing/events/export` and `/api/admin/marketing/events/stk-summary`.

---

## 20. Admin Command Center

### 20.1 User Governance

- **20.1.0** Admin entry workspace at `/admin`.
- **20.1.1** Full user listing at `/admin/users`.
- **20.1.2** User detail view at `/admin/users/[id]`.
- **20.1.3** User role updates and plan changes via `admin.ts` server action.
- **20.1.4** User ban/unban toggle.
- **20.1.5** Provider onboarding fee waiver at `/api/admin/users/[id]/waive-fee`.

### 20.2 Financial Governance

- **20.2.1** Finance summary and overview at `/admin/finance`.
- **20.2.2** Financial reconciliation at `/admin/reconciliation`.
- **20.2.3** Wallet and transaction administration tables.
- **20.2.4** Manual refund processing action.
- **20.2.5** Dispute center at `/admin/disputes`.
- **20.2.6** Payment intent reconciliation workspace at `/admin/reconciliation/payment-intents`.
- **20.2.7** Payment intent reconciliation API at `/api/admin/reconciliation/payment-intents`.

### 20.3 Trust & Compliance Governance

- **20.3.1** Verification queue at `/admin/verifications`.
- **20.3.2** Background check review and approve/reject decisions.
- **20.3.3** Expiring checks and expiring badge monitoring.
- **20.3.4** Admin audit log retrieval at `/admin/logs` backed by `AdminLog` model.
- **20.3.5** Dedicated admin trust workspace at `/admin/trust`.
- **20.3.6** Dedicated admin safety workspace at `/admin/safety`.
- **20.3.7** Dedicated admin insurance workspace at `/admin/insurance`.

### 20.4 Content & Platform Configuration

- **20.4.1** Category CRUD actions via `admin.ts`.
- **20.4.2** System settings model and admin settings page at `/admin/settings` backed by `SystemSetting`.
- **20.4.3** Admin notification delivery debug at `/api/admin/debug-notifications`.

### 20.5 Support Operations

- **20.5.1** Support center at `/admin/support` with filtering and ticket management.
- **20.5.2** Ticket update and resolution actions at `/api/support/tickets/[id]`.

### 20.6 Churn & Growth

- **20.6.1** Churn analysis workspace at `/admin/churn-analysis`.
- **20.6.2** At-risk user report with intervention tooling.

### 20.7 Admin Invite System

- **20.7.1** Admin invite issuance endpoint at `/api/admin/invites`.
- **20.7.2** Admin invite redemption endpoint at `/api/admin/invites/redeem`.
- **20.7.3** Invite-gated admin onboarding flow through `/auth/admin-invite`.

---

## 21. Platform Integrations

### 21.1 Payment & Financial

- **21.1.1** **Daraja STK Push** — M-Pesa wallet top-ups, subscription renewals, onboarding fee payments, with dedicated webhook handlers.
- **21.1.2** M-Pesa STK Push orchestrated via Daraja for all payment flows.
- **21.1.3** Secret-scoped webhook variants for hardened callback validation at `/api/wallet/webhook/[secret]`, `/api/onboarding-fee/webhook/[secret]`, and `/api/subscription/webhook/[secret]`.
- **21.1.4** Payment status polling endpoints for asynchronous verification convergence.

### 21.2 Communication

- **21.2.1** **WhatsApp Business API** — webhook-based inbound event handling and notification delivery.
- **21.2.2** **Firebase Cloud Messaging (FCM)** — push notifications via Firebase Admin SDK.
- **21.2.3** **n8n** — workflow automation for multi-channel language switching.

### 21.3 Storage

- **21.3.1** **AWS S3** — media, document, and PDF upload/delete via `/api/upload` and `/api/upload-pdf`.

### 21.4 Tax & Compliance

- **21.4.1** **eTIMS (KRA)** — system-to-system tax invoice submission.
- **21.4.2** **GavaConnect** — KRA PIN verification and tax compliance status checks.

### 21.5 Real-Time

- **21.5.1** **Socket.IO** — live messaging, activity streams, and real-time UI updates via `server.js`.

---

## 22. Internationalization & Local Context

- **22.1** Message packs in three languages: **English** (`messages/en.json`), **Swahili** (`messages/sw.json`), **Sheng** (`messages/sheng.json`).
- **22.2** `next-intl` integration for App Router i18n via `src/i18n`.
- **22.3** Search normalization utility for Swahili/Sheng query handling.
- **22.4** n8n-powered language switching workflow for dynamic locale changes.

---

## 23. Platform Foundations & Architecture

### 23.1 Core Framework

- **23.1.1** **Next.js App Router** — server components, server actions, and route handlers.
- **23.1.2** **TypeScript** — end-to-end type safety.
- **23.1.3** **Prisma ORM** with PostgreSQL — 89 models, full relational schema.
- **23.1.4** **NextAuth.js** — session management, OAuth, and credentials auth.
- **23.1.5** **Tailwind CSS** with `shadcn/ui` components.

### 23.2 Real-Time & Offline

- **23.2.1** **Socket.IO** custom server (`server.js`) for live events and messaging.
- **23.2.2** Offline sync provider for degraded network operation support.
- **23.2.3** Notification permission overlay and FCM token lifecycle management.

### 23.3 Security

- **23.3.1** NextAuth session and CSRF protection.
- **23.3.2** Two-factor authentication enforcement layer.
- **23.3.3** Webhook signature/token verification for Daraja and WhatsApp.
- **23.3.4** Role-based route protection across Client, Provider, and Admin surfaces.
- **23.3.5** Proxy session model for masked user-to-user communication.

### 23.4 Media & Uploads

- **23.4.1** Unified upload handler at `/api/upload` (POST/DELETE) for images and documents.
- **23.4.2** Dedicated PDF upload handler at `/api/upload-pdf`.

### 23.5 Internal Operations & Automation

- **23.5.1** Churn processing automation via `/api/internal/cron/churn`.
- **23.5.2** Badge expiry automation via `/api/internal/cron/expire-badges`.
- **23.5.3** Reward redemption expiry automation via `/api/internal/cron/expire-reward-redemptions`.
- **23.5.4** Subscription expiry automation via `/api/internal/cron/expire-subscriptions`.
- **23.5.5** Daraja webhook receipt processing automation via `/api/internal/cron/process-daraja-webhook-receipts`.
- **23.5.6** Daraja payment reconciliation automation via `/api/internal/cron/reconcile-daraja-payments`.
- **23.5.7** Notification outbox processing via `/api/internal/notifications/outbox/process`.

---

## 24. API Route Index

### 24.1 Public Routes (No Auth)

| Route                           | Method | Purpose                             |
| ------------------------------- | ------ | ----------------------------------- |
| `/api/categories`               | GET    | All service categories with counts  |
| `/api/services`                 | GET    | Services listing with geo-filtering |
| `/api/services/[id]`            | GET    | Service detail                      |
| `/api/professionals`            | GET    | Professionals listing               |
| `/api/professionals/[id]`       | GET    | Professional public profile         |
| `/api/jobs`                     | GET    | Public job listings                 |
| `/api/jobs/[id]`                | GET    | Job detail                          |
| `/api/jobs/categories`          | GET    | Public job category listing         |
| `/api/location/lookup`          | POST   | Location lookup/reverse lookup      |
| `/api/contact`                  | POST   | Contact form submission             |
| `/api/newsletter/subscribe`     | POST   | Newsletter sign-up                  |
| `/api/newsletter/confirm`       | GET    | Newsletter confirmation             |
| `/api/newsletter/unsubscribe`   | GET    | Newsletter unsubscribe              |
| `/api/auth/signup`              | POST   | New user registration               |
| `/api/auth/verify-email`        | GET    | Email verification                  |
| `/api/auth/resend-verification` | POST   | Resend verification email           |
| `/api/auth/forgot-password`     | POST   | Initiate password recovery          |
| `/api/auth/reset-password`      | POST   | Reset password                      |
| `/api/auth/[...nextauth]`       | ANY    | NextAuth internal handlers          |

### 24.2 Authenticated Routes (Any Role)

| Route                                  | Method       | Purpose                     |
| -------------------------------------- | ------------ | --------------------------- |
| `/api/users/me`                        | GET          | Current session user data   |
| `/api/users/onboarding`                | POST         | Onboarding progress save    |
| `/api/users/onboarding/validate-phone` | POST         | Phone number validation     |
| `/api/settings`                        | GET/POST     | Account settings            |
| `/api/settings/change-password`        | POST         | Password update             |
| `/api/notifications`                   | GET          | Notification list           |
| `/api/notifications/mark-all-read`     | POST         | Clear all unread            |
| `/api/notifications/[id]`              | PATCH/DELETE | Per-notification management |
| `/api/notifications/store-token`       | POST         | FCM token storage           |
| `/api/messages/conversations`          | GET          | Conversation list           |
| `/api/messages/history/[otherUserId]`  | GET          | Chat history                |
| `/api/messages/send`                   | POST         | Send message                |
| `/api/messages/contacts`               | GET          | Recent contacts             |
| `/api/messages/recent-contacts`        | GET          | Optimized recent contacts   |
| `/api/messages/delivered`              | POST         | Message delivery updates    |
| `/api/messages/read`                   | POST         | Message read updates        |
| `/api/calls/heartbeat`                 | POST         | Call liveness heartbeat     |
| `/api/calls/sweep-stale`               | POST         | Stale call cleanup          |
| `/api/messages/[messageId]`            | PATCH/DELETE | Message management          |
| `/api/messages/clear/[otherUserId]`    | DELETE       | Clear conversation          |
| `/api/upload`                          | POST/DELETE  | File upload/delete          |
| `/api/upload-pdf`                      | POST         | PDF upload                  |
| `/api/wallet`                          | GET/POST     | Wallet entry route          |
| `/api/wallet/balance`                  | GET          | Wallet balance              |
| `/api/wallet/transactions`             | GET          | Transaction history         |
| `/api/wallet/topup/status`             | GET          | Wallet top-up status        |
| `/api/badges`                          | GET          | User badges                 |
| `/api/badges/check`                    | POST         | Trigger badge check         |
| `/api/support/tickets`                 | GET/POST     | Support tickets             |
| `/api/user/location`                   | POST         | GPS location update         |
| `/api/user/workspace`                  | GET          | Resolve user workspace      |
| `/api/account/request-deletion`        | POST         | Request account deletion    |
| `/api/account/cancel-deletion`         | POST         | Cancel deletion             |
| `/api/account/cleanup-deletions`       | POST         | Cleanup scheduled deletions |

### 24.3 Client Routes

| Route                                          | Method           | Purpose                  |
| ---------------------------------------------- | ---------------- | ------------------------ |
| `/api/client/dashboard/stats`                  | GET              | Client stats             |
| `/api/client/dashboard/activity`               | GET              | Activity feed            |
| `/api/client/profile`                          | GET/PATCH        | Client profile           |
| `/api/client/jobs`                             | GET/POST         | Client job management    |
| `/api/client/jobs/[id]`                        | GET/PATCH/DELETE | Client job detail        |
| `/api/client/jobs/[id]/proposals`              | GET              | Client job proposals     |
| `/api/client/jobs/[id]/proposals/[proposalId]` | GET/PATCH        | Client proposal decision |
| `/api/client/bookings/[id]`                    | GET              | Client booking detail    |
| `/api/client/settings`                         | GET/PATCH        | Client settings          |
| `/api/client/referral`                         | GET              | Referral stats           |
| `/api/client/analytics/overview`               | GET              | Spending analytics       |
| `/api/client/analytics/trends`                 | GET              | Trend data               |
| `/api/bookings`                                | POST             | Create booking           |
| `/api/bookings/[id]`                           | GET              | Booking detail           |
| `/api/bookings/[id]/timeline`                  | GET              | Booking lifecycle events |
| `/api/bookings/[id]/escrow/milestones`         | GET/POST         | Escrow milestones        |
| `/api/bookings/[id]/dispute`                   | POST             | File dispute             |
| `/api/reviews`                                 | POST             | Submit review            |
| `/api/jobs/[id]/proposals`                     | GET              | View proposals on job    |
| `/api/jobs/[id]/proposals/[proposalId]`        | GET/PATCH        | Proposal decision        |
| `/api/jobs/[id]/timeline`                      | GET              | Job timeline             |
| `/api/negotiations`                            | GET/POST         | Negotiation management   |
| `/api/negotiations/[id]`                       | GET/PATCH        | Negotiation detail       |
| `/api/proposals/[id]`                          | GET/PATCH/DELETE | Proposal management      |
| `/api/wallet/topup`                            | POST             | Top-up initiation        |
| `/api/wallet/verify`                           | POST             | Top-up verification      |
| `/api/bookings/quote`                          | POST             | Booking quote generation |

### 24.4 Provider Routes

| Route                                   | Method           | Purpose                    |
| --------------------------------------- | ---------------- | -------------------------- |
| `/api/provider/stats`                   | GET              | Provider stats             |
| `/api/provider/profile`                 | GET/PATCH        | Provider profile           |
| `/api/provider/activate`                | POST             | Provider activation        |
| `/api/provider/services`                | GET/POST         | Services management        |
| `/api/provider/services/[id]`           | GET/PATCH/DELETE | Service detail management  |
| `/api/provider/availability`            | GET/POST         | Availability config        |
| `/api/provider/availability/check`      | POST             | Slot conflict check        |
| `/api/provider/availability/exceptions` | GET/POST         | Availability exceptions    |
| `/api/provider/availability/month`      | GET              | Monthly availability       |
| `/api/provider/bookings`                | GET              | Incoming bookings          |
| `/api/provider/requests`                | GET              | Incoming requests          |
| `/api/provider/jobs`                    | GET              | Provider jobs              |
| `/api/provider/earnings`                | GET              | Earnings breakdown         |
| `/api/provider/earnings/chart`          | GET              | Earnings chart data        |
| `/api/provider/expenses/jobs`           | GET              | Job-linked expense view    |
| `/api/provider/reviews`                 | GET              | Provider reviews           |
| `/api/provider/activities`              | GET              | Activity stream            |
| `/api/provider/teams`                   | GET              | Teams list                 |
| `/api/bookings/[id]/accept`             | POST             | Accept booking             |
| `/api/bookings/[id]/reject`             | POST             | Reject booking             |
| `/api/proposals`                        | POST             | Submit proposal            |
| `/api/proposals/templates`              | GET/POST         | Proposal templates         |
| `/api/proposals/templates/[id]`         | GET/PATCH/DELETE | Template management        |
| `/api/onboarding-fee/initiate`          | POST             | Start fee payment          |
| `/api/onboarding-fee/status`            | GET              | Onboarding fee status      |
| `/api/subscription/initiate`            | POST             | Start subscription         |
| `/api/subscription/status`              | GET              | Subscription status        |
| `/api/services/[id]/interactions`       | POST             | Track service interactions |
| `/api/professionals/[id]/interactions`  | POST             | Track profile interactions |

### 24.5 Admin Routes

| Route                                       | Method   | Purpose                       |
| ------------------------------------------- | -------- | ----------------------------- |
| `/api/admin/users/[id]/waive-fee`           | POST     | Waive provider fee            |
| `/api/admin/debug-notifications`            | POST     | Test notification delivery    |
| `/api/admin/invites`                        | GET/POST | Admin invite management       |
| `/api/admin/invites/redeem`                 | POST     | Redeem admin invite           |
| `/api/admin/marketing/events/export`        | GET      | Export marketing events       |
| `/api/admin/marketing/events/stk-summary`   | GET      | STK telemetry summary         |
| `/api/admin/partners/memberships`           | GET      | Partner memberships           |
| `/api/admin/reconciliation/payment-intents` | GET      | Payment intent reconciliation |

### 24.6 Analytics & Internal

| Route                                                | Method | Purpose                         |
| ---------------------------------------------------- | ------ | ------------------------------- |
| `/api/analytics/landing-events`                      | POST   | Landing page events             |
| `/api/analytics/jobs-events`                         | POST   | Job interaction events          |
| `/api/recommendations/services`                      | GET    | Service recommendations         |
| `/api/recommendations/professionals`                 | GET    | Professional recommendations    |
| `/api/recommendations/jobs`                          | GET    | Job recommendations             |
| `/api/internal/jobs/sla-monitor`                     | POST   | Job SLA cron check              |
| `/api/internal/cron/churn`                           | POST   | Churn processing cron           |
| `/api/internal/cron/expire-badges`                   | POST   | Badge expiry cron               |
| `/api/internal/cron/expire-reward-redemptions`       | POST   | Reward redemption expiry cron   |
| `/api/internal/cron/expire-subscriptions`            | POST   | Subscription expiry cron        |
| `/api/internal/cron/process-daraja-webhook-receipts` | POST   | Process Daraja webhook receipts |
| `/api/internal/cron/reconcile-daraja-payments`       | POST   | Reconcile Daraja payments       |
| `/api/internal/notifications/outbox/process`         | POST   | Process notification outbox     |
| `/api/integrations/n8n/language-switch`              | POST   | n8n language workflow           |
| `/api/integrations/n8n/language-switch/debug`        | POST   | n8n debug                       |

### 24.7 Webhooks

| Route                                  | Source        | Purpose                           |
| -------------------------------------- | ------------- | --------------------------------- |
| `/api/wallet/webhook`                  | Daraja        | Wallet top-up settlement          |
| `/api/wallet/webhook/[secret]`         | Daraja        | Wallet settlement (secret-scoped) |
| `/api/onboarding-fee/webhook`          | Daraja        | Fee payment sync                  |
| `/api/onboarding-fee/webhook/[secret]` | Daraja        | Fee sync (secret-scoped)          |
| `/api/subscription/webhook`            | Daraja        | Subscription renewal sync         |
| `/api/subscription/webhook/[secret]`   | Daraja        | Subscription sync (secret-scoped) |
| `/api/webhooks/whatsapp`               | Meta/WhatsApp | Inbound WhatsApp events           |

### 24.8 Additional Implemented Route Surfaces

- `/api/bookings/[id]/confirm-completion` (booking completion lifecycle).
- `/api/rewards/redemptions/validate` and `/api/rewards/redemptions/consume` (loyalty redemption lifecycle).
- `/payment/verify` (unified payment verification page surface used across STK flows).

---

## 25. Data Models Index

### 25.1 Identity & Auth

`User` · `Account` · `Session` · `VerificationToken` · `TwoFactorToken` · `TwoFactorConfirmation` · `UserToken` · `Profile` · `ProxySession`

### 25.2 Marketplace

`Category` · `Service` · `Job` · `JobTimelineEvent` · `Proposal` · `ProposalStatusHistory` · `ProposalTemplate` · `Booking` · `BookingSlot` · `BookingNegotiation` · `BookingLifecycleEvent`

### 25.3 Trust & Safety

`Review` · `Dispute` · `SupportTicket` · `Notification` · `Message` · `MessageReport` · `BackgroundCheck` · `TrustedContact` · `BlockedUser` · `SOSAlert` · `Call` · `InsuranceClaim` · `VerificationBadge` · `TrustScore` · `VerificationAudit`

### 25.4 Financial

`Payment` · `Wallet` · `Transaction` · `Subscription` · `PromoCode` · `Referral`

### 25.5 Tax & Invoicing

`Invoice` · `ETIMSSubmission` · `TaxFiling` · `TaxSettings`

### 25.6 Provider Operations

`Availability` · `AvailabilityException` · `Expense`

### 25.7 Team OS

`Team` · `TeamMember` · `TeamJob` · `TeamJobAssignment` · `TeamEarning` · `TeamPayroll` · `TeamAnnouncement`

### 25.8 Growth & Retention

`Badge` · `UserBadge` · `ChurnScore` · `ChurnIntervention` · `UserLoyalty` · `LoyaltyPointTransaction` · `Partner` · `PartnerReward` · `RewardRedemption` · `NewsletterSubscriber`

### 25.9 Admin & Governance

`AdminLog` · `SystemSetting`

### 25.10 Solar & Vertical Platform

`VerticalCategory` · `VerticalCertification` · `VerticalSpecialist` · `EquipmentRegistry` · `ProjectTemplate` · `VerticalProject` · `ProjectMilestone` · `SolarEstimationConfig`

### 25.11 Additional Implemented Models (Coverage Additions)

`AdminInvite` · `IdentityVerificationRequest` · `MarketingEventLog` · `MessageConversationState` · `NotificationDelivery` · `NotificationOutbox` · `PartnerUser` · `PaymentIntent` · `PaymentWebhookReceipt` · `PricingQuote` · `ServiceInteractionDedup` · `SupportTicketMessage` · `TeamInvitation` · `WalletTopUp`

---

_JustInTime Feature Documentation — Generated April 2026_
