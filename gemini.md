# JustinTime Platform Documentation

## 1. Overview

JustinTime is a hybrid job and service marketplace that connects job seekers, freelancers, service providers, and clients across Kenya. The platform bridges the gap between online gigs and offline services, enabling clients to quickly find reliable workers, book their services, and pay securely.

**Target Users:**

- Freelancers (designers, writers, developers, virtual assistants)
- Service providers (plumbers, electricians, tutors, mechanics, salonists)
- Businesses (SMEs looking to hire casual or contract workers)
- Individual clients needing one-time tasks completed

**Value Proposition:**

- Fast, reliable access to skilled labor.
- Secure, escrow-based payments.
- Trust through ratings, reviews, and verified profiles.
- AI-assisted job matching for speed and accuracy.

---

## 2. Core Features

### 2.1 User Management

- **User Types:** Client, Service Provider, Freelancer, Business Account, Admin.
- **Registration/Login:** Email, phone number (OTP), Google sign-in.
- **Profile Setup:**

  - Basic info (name, phone, email, profile picture)
  - Skills, service categories, hourly rate, availability.
  - Verification (ID upload, business registration for organizations).

- **Profile Ratings & Reviews:** Clients can leave ratings; providers can respond.

### 2.2 Service Listings

- **Categories:** Home repairs, tech services, tutoring, logistics, design, etc.
- **Subcategories:** (e.g., under home repairs → plumbing, carpentry, electrical).
- **Search & Filters:** Location, price range, ratings, availability.
- **Provider Portfolio:** Work history, media uploads (photos, videos).

### 2.3 Job Posting & Bidding

- **Job Creation:** Clients post tasks with description, budget, location, and deadline.
- **Bidding/Proposal:** Providers can apply with offers.
- **Direct Hire:** Clients can directly hire providers without bidding.

### 2.4 Booking & Scheduling

- **Calendar Integration:** Providers set availability.
- **Instant Booking:** Auto-match providers based on availability and proximity.
- **Rescheduling:** Clients and providers can reschedule mutually.

### 2.5 AI-Powered Recommendations

- **Matching Algorithm:** Suggests top providers based on:

  - Location proximity
  - Skills match
  - Price range
  - Ratings & reliability score

- **Smart Notifications:** Alerts clients about best matches within minutes of posting.

### 2.6 Payments & Escrow

- **Payment Methods:** M-Pesa, card payments, bank transfer.
- **Escrow System:** Funds held until task completion.
- **Milestones:** For larger projects (e.g., software dev), partial releases supported.
- **Payouts:** Providers receive funds via M-Pesa or bank transfer.

### 2.7 In-App Communication

- **Real-Time Chat:** Text, voice notes, file sharing.
- **Push Notifications:** Updates for job applications, booking confirmations, payment releases.
- **Call Option:** Privacy-protected calls between clients and providers.

### 2.8 Dispute Resolution

- **Reporting System:** Clients/providers can raise disputes.
- **Resolution Flow:**

  - Mediation by platform support team.
  - Partial refund or payment release based on evidence.

### 2.9 Subscription Plans

- **Free Tier:** Basic listing, standard visibility.
- **Pro Tier:** Higher ranking, featured listing, analytics dashboard.
- **Business Tier:** Multiple provider accounts, API integrations, bulk hiring.

### 2.10 Analytics Dashboard

- **For Providers:** Revenue tracking, job completion rate, ratings overview.
- **For Clients:** Expense summary, frequently hired providers.
- **Admin Panel:** Platform-wide metrics, commission revenue tracking.

### 2.11 Loyalty & Referral Program

- **Points System:** Earn points for each booking.
- **Discounts:** Redeem points for discounts.
- **Referral Bonus:** Both referrer and referee receive credits.

### 2.12 Security & Compliance

- **Data Protection:** Comply with Kenya Data Protection Act.
- **Secure Authentication:** OTP, optional 2FA.
- **Fraud Detection:** Monitor suspicious activity.

---

## 3. User Flow

### 3.1 Client Flow

1. **Signup/Login** → 2. **Search or Post a Job** → 3. **Select Provider or Wait for Bids** → 4. **Book & Pay** → 5. **Work Completed** → 6. **Leave Review**

### 3.2 Provider Flow

1. **Signup & Verification** → 2. **List Services/Set Availability** → 3. **Receive Job Requests** → 4. **Accept & Deliver Service** → 5. **Get Paid** → 6. **Respond to Reviews**

---

## 4. Monetization Model

- **Commission:** 5-15% per completed transaction.
- **Subscription Plans:** Monthly/annual plans for extra visibility.
- **Featured Listings:** Pay-per-boost for service ads.
- **Corporate Hiring Solutions:** Bulk hiring packages for SMEs.

---

## 5. Technology Stack

- **Frontend:** Next.js (App Router), React 19, TailwindCSS, Framer Motion.
- **Backend:** nextjsApiRoutes +  PostgreSQL (Prisma ORM), Socket.IO.
- **Payments:** M-Pesa API(daraja api), paypal (for cards).
- **AI:** Recommendation engine (TensorFlow/Scikit-learn for early MVP).
- **Hosting:** DigitalOcean,
- **Authentication:** JWT, NextAuth.js.
- **Deployment:** Vercel
- **DATABASE:** PostgreSQL,Neon
- **STATE MANAGEMENT:** TanStack Query
- **UI/UX:** Framer Motion, TailwindCSS


---

## 6. Competitive Advantage

- **Unified Platform:** Online gigs + offline jobs in one place.
- **Mobile-First:** Lightweight and offline-friendly.
- **AI Matching:** Faster and more accurate job-provider pairing.
- **Escrow Payments:** Trust-building mechanism.

---

## 7. Roadmap

| Phase                | Deliverables                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **MVP (3-6 months)** | User registration, service listings, job posting, bookings, M-Pesa payments, chat, reviews. |
| **Phase 2**          | AI recommendations, analytics dashboard, subscription plans, dispute resolution system.     |
| **Phase 3**          | Business APIs, loyalty programs, advanced fraud detection, nationwide marketing campaign.   |

---

## 8. Risk Analysis

- **Trust Risk:** Mitigated by verified profiles, escrow, reviews.
- **Adoption Risk:** Launch with targeted marketing in one county (e.g., Nairobi or Eldoret) before scaling.
- **Competition Risk:** Focus on speed, reliability, and low fees.

---

## 9. Success Metrics

- **Active Users:** Number of monthly active clients and providers.
- **Jobs Posted & Completed:** Engagement measure.
- **GMV (Gross Marketplace Value):** Total transaction value processed.
- **Customer Retention:** % of repeat bookings.

---

## 10. Future Enhancements

- AI-based skill verification (automated tests).
- Integration with government job databases.
- Micro-lending for top-rated providers.
- API integrations with HR software for companies.

---

This documentation serves as the foundational blueprint for building JustinTime into a scalable, revenue-generating platform tailored to the Kenyan market.

Got it — here’s a **full list of screens** you’ll need for **JustinTime**, broken down by user type (Service Providers, Consumers/Clients, Admin).

---

## 👤 Service Provider Screens

1. **Welcome / Onboarding Screen** – Intro to the platform, benefits for providers.
2. **Sign Up / Login Screen** – Email, phone (OTP), Google sign-in.
3. **Profile Setup Screen** – Name, bio, skills, hourly rate, portfolio upload.
4. **Verification Screen** – ID upload, document review status.
5. **Dashboard (Home)** – Overview of jobs, bookings, earnings, notifications.
6. **Service Listing Management**

   - Add/Edit Service Screen
   - Set Pricing & Availability Screen

7. **Job Applications / Bids Screen** – View open jobs and submit proposals.
8. **Job Requests (Direct Hire)** – Accept/reject job offers.
9. **Booking Calendar Screen** – Manage upcoming bookings, reschedule.
10. **Chat / Messaging Screen** – Communicate with clients, send files/voice notes.
11. **Earnings & Payout Screen** – Track earnings, request payout, payout history.
12. **Reviews & Ratings Screen** – View client reviews, respond to feedback.
13. **Notifications Screen** – Job alerts, payment notifications, system updates.
14. **Settings Screen** – Edit profile, privacy, account deletion, password reset.
15. **Subscription / Upgrade Screen** – View plans, upgrade to Pro/Business.
16. **Support & Dispute Screen** – Raise disputes, contact support, track resolution.\n\n---\n\n## 👥 Consumer / Client Screens\n1. **Welcome / Onboarding Screen** – Explains how to find and hire providers.\n2. **Sign Up / Login Screen** – Email, phone, Google sign-in.\n3. **Home / Explore Screen** – Featured services, search bar, categories.\n4. **Search & Filter Screen** – Filter by category, location, price, ratings.\n5. **Provider Profile Screen** – View provider details, portfolio, reviews.\n6. **Post a Job Screen** – Describe job, budget, deadline, attach files.\n7. **Job Listing Management** – View open, in-progress, and completed jobs.\n8. **Job Proposals Screen** – View bids from providers, accept/reject.\n9. **Direct Booking Screen** – Book provider instantly from profile.\n10. **Checkout & Payment Screen** – M-Pesa, card, or wallet payment.\n11. **Booking Confirmation Screen** – Job summary, estimated completion time.\n12. **Chat / Messaging Screen** – Negotiate, send files, coordinate.\n13. **Review & Rating Screen** – Leave ratings after job completion.\n14. **Notifications Screen** – Job updates, payment confirmations.\n15. **Wallet & Payment History Screen** – Track past payments, refunds.\n16. **Settings Screen** – Manage account, privacy, support requests.\n17. **Referral & Loyalty Program Screen** – View points, redeem rewards.\n\n---\n\n## 🛠️ Admin Screens\n1. **Admin Login Screen** – Secure access.\n2. **Dashboard / Analytics Screen** – Overview of users, jobs, revenue.\n3. **User Management Screen** – Approve/verify providers, suspend accounts.\n4. **Service & Category Management** – Add/edit service categories.\n5. **Job & Booking Management** – Monitor active jobs, disputes.\n6. **Payment Management Screen** – Track transactions, process refunds.\n7. **Dispute Resolution Screen** – Review cases, make decisions.\n8. **Subscription Management Screen** – Manage plans, billing.\n9. **Notifications & Announcements Screen** – Push updates to users.\n10. **Reports & Metrics Screen** – Download data, monitor platform health.\n11. **Support Ticket Management Screen** – Respond to user issues.\n12. **System Settings Screen** – Configure platform rules, fees, and policies.\n\n---\n\nWould you like me to also **group these screens into modules** (e.g., Auth Module, Payment Module, Job Module) so your dev team can work on them in phases? This will make development more structured.
