# JustInTime Complete Feature Overview

This document is the full capability map of the JustInTime application, covering user-facing features, provider business tools, admin operations, financial and compliance systems, integrations, and technical platform features.

## Product Scope Snapshot

- 85+ App Router pages and feature screens.
- 89 API routes across public, authenticated, client, provider, admin, and webhook surfaces.
- 68 Prisma models powering marketplace, trust, finance, tax, team, loyalty, churn, and vertical systems.
- Multi-role architecture: Guest, Client, Provider, Admin.

## 1. End-to-End Experience Layers

### 1.1 Guest and Discovery Layer

- Landing and conversion funnels for services and professionals.
- Public service catalog with category browsing and service details.
- Public professionals directory with detailed profiles and social proof.
- Public job listings and detail pages for marketplace demand visibility.
- Public content and trust pages: About, FAQ, Terms, Privacy, Cookie Policy, Contact, Blog.
- Dedicated vertical discovery for Solar marketplace and estimation entry.

### 1.2 Authentication and Account Lifecycle

- Email and OAuth authentication via NextAuth.
- Signup, login, verify-email, forgot-password, reset-password flows.
- Verification request and auth error handling pages.
- Credentials verification endpoint for secure login processing.
- Account deletion lifecycle:
  - Request deletion.
  - Cancel deletion.
  - Cleanup scheduled deletions.

### 1.3 Onboarding and Role Personalization

- Multi-step onboarding shell with role selection.
- Separate provider and client detail steps.
- Verification step with camera capture and identity workflow.
- Location capture, denied-location handling, and completion step.
- Dedicated client onboarding and provider onboarding entry points.
- Onboarding completion dashboard handoff.

### 1.4 Role-Specific Workspaces

- Client workspace with dashboard, jobs, proposals, bookings, wallet, messages, reviews, analytics, referral, settings, and profile.
- Provider workspace with dashboard, services, jobs, requests, bookings, earnings, analytics, availability, invoices, verification, premium settings, team, payroll, expenses, safety, reviews, wallet, help, and settings.
- Admin workspace with dedicated authentication, overview dashboard, and specialized operational modules.

## 2. Marketplace and Commerce Core

### 2.1 Services Marketplace

- Category-based service discovery.
- Service creation and management for providers.
- Service detail pages with rich profile and interaction modules.
- Service interaction tracking for performance and ranking intelligence.
- Promotion support for service visibility boosts.

### 2.2 Professionals Marketplace

- Public professional listing with filtering and ranking.
- Professional detail pages and interaction analytics.
- Provider profile APIs and management capabilities.
- Verification-aware trust signaling in discovery surfaces.

### 2.3 Jobs, Proposals, and Negotiation

- Public and client-side job posting lifecycle.
- Job details with provider proposal pipeline.
- Proposal submission, review, acceptance, and rejection flows.
- Booking negotiation object model and APIs for pre-booking agreement.
- Negotiation route support for structured offer exchange.

### 2.4 Booking Lifecycle

- Booking form with service selection, date/time, location, negotiation, and summary components.
- Booking creation and retrieval APIs.
- Provider-side accept and reject controls.
- Booking slot and availability-aware scheduling.
- Booking cancellation support with policy engine integration.
- Invoice page per booking for fiscal closure.

## 3. Communication and Engagement Systems

### 3.1 In-App Messaging

- Real-time conversation model backed by message APIs.
- Conversation listing, contacts, and history endpoints.
- Send, fetch, and clear messaging operations.
- Message-level management endpoint.
- Dedicated client and provider message pages.

### 3.2 Calls and Direct Communication

- Secure call initiation server action.
- Call history retrieval and lifecycle logging.
- Call status tracking from start to completion.
- Communication components for call overlay and video call interface.
- Secure call button flows integrated in user communication surfaces.

### 3.3 Notifications and Omnichannel Alerts

- Notification center APIs and dashboard pages.
- Mark-all-read and per-notification update/delete actions.
- FCM token storage for push delivery.
- Admin notification debug endpoint.
- WhatsApp webhook endpoint for external message event handling.

## 4. Trust, Safety, Verification, and Quality

### 4.1 Identity and Verification

- Verification-focused onboarding with camera capture.
- Verification badge request and status lifecycle.
- Background check submission and provider verification flows.
- Admin verification controls for approve/revoke decisions.

### 4.2 Trust-as-a-Service (TaaS)

- Verification badge system with status tracking.
- Trust score engine with weighted component scoring.
- Tier progression model from unverified to elite levels.
- Premium pricing toggles tied to trust state.
- Badge sync and automatic badge checks.
- Verification audit model for reviewable history.

### 4.3 Safety Operations

- Panic/SOS trigger and active alert retrieval.
- SOS cancel operation and alert lifecycle management.
- Trusted contacts management (add/remove/list).
- Safety dashboard in provider workspace.

### 4.4 Dispute and Review Integrity

- Structured dispute model and admin dispute center.
- Dispute resolution actions and refund preview support.
- Review and ratings system with submission route.
- Booking-linked review workflow for service quality controls.

### 4.5 Insurance and Risk Events

- Insurance claim submission flows for incident handling.
- Claims retrieval in operational contexts.
- Insurance claim model linked to bookings and user accountability.

## 5. Financial Systems, Billing, and Compliance

### 5.1 Wallet and Transactions

- Wallet overview page and APIs.
- Balance endpoint for current available funds.
- Transactions endpoint for financial history.
- Wallet top-up initiation and verification routes.
- IntaSend webhook processing for financial settlement updates.

### 5.2 Provider Revenue and Monetization

- Provider earnings APIs and chart data endpoints.
- Promote service monetization action.
- Credit purchase flows and transaction list components.
- Onboarding fee payment initiation and webhook reconciliation.

### 5.3 Subscriptions and Plans

- Subscription initiation for paid plans.
- Subscription status checks.
- Subscription webhook handling for renewals and state sync.
- Plan and user-role update support in admin/server actions.

### 5.4 Invoicing and Tax Compliance

- Invoice generation per booking.
- Invoice history, invoice stats, and invoice detail retrieval.
- Retry submission for failed invoice workflows.
- Tax breakdown and fiscal reporting components.
- Tax settings page and update actions.
- KRA PIN verification and persistence flows.
- Tax compliance status retrieval.
- Tax filing support including nil-return action.
- ETIMS submission model and eTIMS service integration.
- Tax calculator modules for VAT and related fiscal handling.

### 5.5 Promo and Growth Revenue

- Promo code create and validation actions.
- Admin promo management module.
- Promo model integrated with booking and payment economics.

## 6. Provider Business OS

### 6.1 Profile and Service Operations

- Provider profile management APIs and dashboard pages.
- Service CRUD support for provider offerings.
- Provider activity streams and stats endpoints.

### 6.2 Availability and Scheduling Engine

- Weekly availability configuration.
- Monthly availability retrieval for calendar views.
- Availability exception handling for one-off changes.
- Slot validation endpoint for conflict-safe bookings.

### 6.3 Earnings and Performance Intelligence

- Earnings and trend views for provider business performance.
- Review aggregation support for reputation management.
- Dashboard analytics modules and status cards.

### 6.4 Expense Intelligence

- Expense creation, retrieval, and deletion actions.
- Receipt scan action for spend capture workflows.
- Provider expense page and related list/modals.

## 7. Team and Agency Management OS

### 7.1 Team Structure and Membership

- Team creation and team dashboard retrieval.
- Member invitation and direct add/remove operations.
- Member role and permission updates.
- Member status and location updates.

### 7.2 Team Job Dispatch

- Team jobs module in dashboard.
- Assign members to jobs with assignment tracking.
- Team job status updates and progress operations.
- Daily jobs and collections retrieval actions.

### 7.3 Team Earnings and Payroll

- Earnings split calculation modules.
- Member balance retrieval actions.
- Payroll generation and processing actions.
- Pending payroll retrieval and history tracking.
- Team payroll model and payout lifecycle coverage.

### 7.4 Team Communication and Coordination

- Team announcement model support.
- Team-centric UI cards and operational components.

## 8. AI, Analytics, Gamification, and Retention

### 8.1 Intelligent Matching and Recommendations

- Recommendation hooks and matching-oriented data utilities.
- Geolocation utilities for nearest-provider relevance.
- Search normalization utility for local language patterns.

### 8.2 Dynamic Pricing and Commercial Intelligence

- Pricing engine modules.
- Surge pricing components and simulation page.

### 8.3 Churn Prediction and Re-Engagement

- Churn score models and intervention models.
- At-risk user retrieval and intervention creation actions.
- Triggered churn analysis and user re-engagement actions.
- Admin churn analysis workspace.

### 8.4 Gamification, Badges, and Loyalty

- Badge model and user badge model.
- Badge definitions and automatic checker modules.
- Badge progress and sync actions.
- Loyalty points and leaderboard support.
- Partner rewards, redemption history, and reward redemption actions.
- Partner ecosystem seeding action.

## 9. Specialized Vertical: Solar and Green Tech

### 9.1 Solar Discovery and Estimation

- Dedicated solar landing page.
- Multi-step solar estimate page.
- Quick estimate and detailed estimate actions.
- Estimation calculator library for sizing and ROI-style outputs.

### 9.2 Specialist and Certification Workflows

- Solar specialist registration action.
- Vertical certification submission workflow.
- Featured solar specialist retrieval action.
- Vertical availability retrieval action.

### 9.3 Solar Project Lifecycle

- Solar quote request action.
- Vertical project and milestone models.
- Project status update actions.
- Equipment registry and template models for execution support.

## 10. Referral, Support, and Customer Care

- Referral model and client referral APIs.
- Client dashboard stats and activity streams.
- Support ticket creation and update APIs.
- Admin support operations dashboard and filtering modules.
- Contact and newsletter ingestion routes for growth funnels.

## 11. Admin Command Center

### 11.1 User Governance

- User listing and detailed user views.
- User role updates, plan updates, ban toggles.
- Provider fee waiver action.

### 11.2 Financial Governance

- Finance summary retrieval.
- Wallet and transaction administration tables.
- Manual refund processing action.
- Dispute and finance operational screens.

### 11.3 Trust and Compliance Governance

- Verification queue handling.
- Background checks review and decision actions.
- Expiring checks and expiring badges monitoring.
- Admin logs retrieval and audit visibility.
- System settings update and operations.

### 11.4 Category and Platform Configuration

- Category CRUD actions.
- System setting models and admin settings screens.
- Enhanced admin management components for operational scale.

## 12. Platform Foundations and Integrations

### 12.1 Technical Stack

- Next.js App Router architecture with server actions.
- Prisma ORM with PostgreSQL schema and relations.
- NextAuth session and account framework.
- Tailwind UI with role-specific dashboards.

### 12.2 Real-Time and Offline Resilience

- Socket integration for live messaging and activity updates.
- Offline sync provider for degraded network operation support.
- Notification permission overlays and FCM token lifecycle.

### 12.3 External Integrations

- IntaSend payment flows and webhook handlers.
- Firebase and Firebase Admin integrations.
- WhatsApp webhook and service integration.
- S3 integration for media and document workflows.
- eTIMS and KRA tax verification integrations.
- Gava integration utilities for compliance checks.

### 12.4 Internationalization and Local Context

- Multi-language message packs: English, Swahili, Sheng.
- Localized search helpers and vernacular normalization.

## 13. Data Domain Coverage (Prisma)

Complete data-domain support includes:

- Identity and auth: User, Account, Session, VerificationToken, TwoFactorToken, TwoFactorConfirmation, UserToken, Profile.
- Marketplace: Category, Service, Job, Proposal, Booking, BookingSlot, BookingNegotiation.
- Trust and support: Review, Dispute, SupportTicket, Notification, Message, BackgroundCheck, TrustedContact, SOSAlert, Call, InsuranceClaim.
- Financial: Payment, Wallet, Transaction, Subscription, PromoCode, Referral.
- Tax and invoicing: Invoice, ETIMSSubmission, TaxFiling, TaxSettings.
- Provider operations: Availability, AvailabilityException.
- Admin and governance: AdminLog, SystemSetting.
- Team OS: Team, TeamMember, TeamJob, TeamJobAssignment, TeamEarning, TeamPayroll, TeamAnnouncement.
- Growth and retention: Badge, UserBadge, ChurnScore, ChurnIntervention, UserLoyalty, LoyaltyPointTransaction, Partner, PartnerReward, RewardRedemption, NewsletterSubscriber.
- TaaS verification: VerificationBadge, TrustScore, VerificationAudit.
- Vertical platform: VerticalCategory, VerticalCertification, VerticalSpecialist, EquipmentRegistry, ProjectTemplate, VerticalProject, ProjectMilestone, SolarEstimationConfig.

## 14. Canonical Feature Route Index

High-importance feature routes currently present in the app:

- Authentication: /auth/login, /auth/signup, /auth/forgot-password, /auth/reset-password, /auth/verify-email.
- Public marketplace: /services, /services/[id], /professionals, /professionals/[id], /jobs, /jobs/[id].
- Booking and transactions: /booking, /wallet, /bookings/[id]/invoice.
- Provider workspace: /dashboard, /dashboard/services, /dashboard/jobs, /dashboard/bookings, /dashboard/availability, /dashboard/earnings, /dashboard/invoices, /dashboard/settings/tax, /dashboard/verification, /dashboard/premium, /dashboard/expenses.
- Team OS: /dashboard/team, /dashboard/team/jobs, /dashboard/team/members, /dashboard/team/payroll.
- Client workspace: /client/dashboard, /client/jobs, /client/proposals, /client/bookings, /client/messages, /client/reviews/submit/[bookingId], /client/analytics, /client/referral.
- Admin workspace: /admin/dashboard, /admin/users, /admin/bookings, /admin/disputes, /admin/verifications, /admin/finance, /admin/support, /admin/logs, /admin/settings, /admin/churn-analysis, /admin/marketing/promos.
- Solar vertical: /solar, /solar/estimate.

## 15. Strategic Modules Delivered in Current Codebase

- eTIMS fiscal compliance and invoice orchestration.
- Team and agency operating system with payroll and dispatch.
- Trust-as-a-Service verification and trust score economics.
- Solar and green-tech vertical estimation and specialist management.

## 16. Documentation Notes

- This overview is implementation-grounded and intended as the top-level source for product capability inventory.
- API route details are documented in docs/api/routes.md.
- Manual verification workflows are documented in docs/features/testing-guide.md.
