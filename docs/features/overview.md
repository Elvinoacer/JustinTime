# JustInTime - Features & Capabilities

This document provides a comprehensive overview of the JustInTime platform's current capabilities and roadmap features, designed for the Kenyan gig economy.

## 1. Core Platform Features

- **Hyperlocal Matching**
  Advanced location-based search using GIS to find the nearest service providers within specific neighborhoods.
- **Real-time Messaging**
  Instant communication system (Socket.io) supporting text, file sharing, and image exchange between clients and providers.
- **Booking & Scheduling**
  Interactive calendar management with support for recurring availability, exceptions, and instant time-slot selection.
- **Price Negotiation & Bidding**
  Secure negotiation system for job postings and direct hires, allowing fair terms to be agreed upon before booking.
- **Operational Integrity Tools**
  - **Cancellation Policy Engine**: Automated rules for refunds and penalties to prevent time-wasting.
  - **Admin Moderation**: Back-office dashboards for user management, manual refunds, and audit logs.
- **Communication Enhancements**
  - **WhatsApp Deep Integration**: Automated reminders and chat-based lead qualification to reduce no-shows.
  - **In-App Calling**: Privacy-preserving VoIP calls that mask user phone numbers.

## 2. Financial & Fiscal Ecosystem

- **Hybrid Revenue Architecture**
  - **Integrated Wallet**: Deposit, withdraw, and hold balances for seamless internal transactions.
  - **Subscription Tiers**: Pro and Business models for advanced tools and lower commissions.
  - **Lead Generation Credits**: Option for providers to pay-per-lead as an alternative to commission.
  - **Promoted Listings**: Paid visibility boosts for ambitious providers.
- **Secure Localized Payments**
  Integration with IntaSend supporting M-Pesa, Airtel Money, and international cards.
- **Regulatory & Fiscal Compliance**
  - **eTIMS Gatekeeper**: Automated KRA-compliant tax invoicing for every transaction with real-time compliance tracking.
  - **Excise Duty Engine**: Automatic calculation of digital service taxes (per Finance Bill 2025).
  - **GavaConnect Integration**: Real-time KRA PIN/TCC verification and automated Nil Return filing.
  - **Tax Settings Dashboard**: Provider-specific KRA PIN, VAT registration, and tax compliance management.
- **Referral Program**
  "Invite & Earn" system rewarding users for growing the platform community.

## 3. Trust, Safety & Security

- **Multi-Layer Identity Verification**
  Robust onboarding with AI-powered face detection and ID document verification.
- **Advanced Safety Tools**
  - **SOS / Panic Button**: Real-time location sharing with trusted contacts during active jobs.
  - **Phone Anonymization**: Proxy system to protect user numbers and prevent off-platform poaching.
- **Provider Vetting & Monitoring**
  - **Deep Background Checks**: Criminal record verification and continuous monitoring of licenses/status.
- **Dispute & Quality Assurance**
  - **Dispute Resolution Center**: Structured mediation for handling conflicts and refunds.
  - **Reviews & Ratings**: Comprehensive accountability system for both clients and providers.
  - **Service Guarantee**: "Trust Fee" funded liability protection for hardware damages.
- **Trust-as-a-Service (TaaS) Premium Verification** ⭐ NEW
  - **Verification Badges**: 8 badge types including KRA Verified, Police Cleared, ID Verified, Top Rated.
  - **Trust Score System**: 5-component scoring (Identity, Conduct, Performance, Reliability, Compliance).
  - **Premium Tiers**: UNVERIFIED → BASIC → VERIFIED → PREMIUM → ELITE progression.
  - **Premium Pricing**: Verified Pros can charge 10-30% more based on their tier.
  - **Government-Verified Badge**: Combined verification status for maximum trust.

## 4. Smart & AI Features

- **AI-Powered Matching Engine**
  Intelligent provider recommendations using TensorFlow.js to match client needs with the best-suited experts.
- **Dynamic & Surge Pricing**
  Smart algorithms that adjust rates based on demand spikes, weather conditions, or specialized hours.
- **Gamification & Engagement**
  - **Badges & Achievements**: Social proof and rewards for performance (e.g., "Super Fast", "100 Jobs").
  - **Predictive Churn Modeling**: AI identification of at-risk users to trigger automated re-engagement.
- **Loyalty & Partner Rewards**
  Tiered ecosystem offering discounts at hardware stores, equipment rentals, and insurance partners for top Pros.
- **Advanced Analytics**
  Dashboards for tracking earnings, spending habits, job trends, and performance metrics.

## 5. Professional Tools (SaaS for Pros)

- **Team & Agency Management** ⭐ NEW
  - **Team Dashboard**: Centralized view of team members, earnings, and job assignments.
  - **Member Management**: Invite, remove, and manage team member roles (ADMIN, DISPATCHER, MEMBER).
  - **Job Dispatch**: Create, assign, and track team jobs with real-time status updates.
  - **Earnings Calculator**: Split job revenue among team members with configurable rates.
  - **Payroll Processing**: Automated payroll generation and payment tracking.
  - **Team Announcements**: Internal communication system for team updates.
- **AI-Powered Expense Management**
  Automated receipt scanning and job-based expense tracking to help Pros manage their business finances.

## 6. Specialized Verticals

- **Solar & Green Tech Marketplace** ⭐ NEW
  - **Dedicated Solar Landing**: JustInTime Solar branded marketplace for solar installers.
  - **Solar Estimation Calculator**: Bill-based system sizing, pricing, and ROI calculations.
  - **Specialist Onboarding**: Vertical-specific registration with experience and certifications.
  - **Project Management**: Full project lifecycle from quote request to warranty tracking.
  - **Certification Verification**: EPRA licenses and professional certification verification.
  - **Equipment Registry**: Tools and inventory tracking for specialists.
  - **Featured Installers**: Showcase verified solar professionals to clients.
- **Future Verticals**: HVAC, Security Systems, Smart Home, EV Charging, Water Systems.

## 7. Accessibility & Infrastructure

- **Offline-First Support (PWA)**
  Progressive Web App with local caching (IndexedDB) to ensure functionality in low-connectivity areas.
- **Multi-Language & Vernacular Support**
  Localization for English, Swahili, and Sheng with normalized NLP for local search terms.
- **Omnichannel Reach**
  Push notifications (FCM), SMS alerts, and WhatsApp status updates for ubiquitous communication.

## 8. Technical Enablers

- **Real-time Architecture**: Custom Socket.io server for instant state synchronization.
- **AI Framework**: TensorFlow.js powering on-device and server-side intelligence.
- **Secure Authentication**: NextAuth.js providing 2FA and multi-provider secure login.
- **Performance Optimized**: Low-latency edge computing for fast access across East Africa.
- **Prisma ORM**: Type-safe database access with PostgreSQL.
- **Server Actions**: Modern Next.js 15 server actions for secure data mutations.

---

## New Features Summary (Strategic Roadmap Implementation)

| Feature | Status | Key Capabilities |
|---------|--------|-----------------|
| eTIMS Gatekeeper | ✅ Complete | Auto tax invoicing, KRA compliance, PDF generation |
| Team Management OS | ✅ Complete | Crew management, job dispatch, payroll, earnings |
| TaaS Premium Verification | ✅ Complete | Trust scores, badges, premium pricing tiers |
| Solar & Green Tech Vertical | ✅ Complete | Estimation calculator, specialist marketplace |
