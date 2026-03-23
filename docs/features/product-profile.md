# JustInTime - Product Profile

## 1. Identity Section
- **Product Name**: JustInTime
- **Category**: Service Marketplace Platform
- **Marketing Tagline**: "Your Skills, Just in Time, Right Where You Are."
- **Website URL**: 
- **Short Description**: 
  JustInTime is a hyperlocal skill marketplace designed to bridge the gap between anyone who can work and local clients. Whether you need a service immediately or want to schedule a job, JustInTime provides a secure, location-based platform where talent meets demand. Focused on the gig economy, it empowers individuals to monetize their skills and businesses to find reliable local help effortlessly. Now featuring specialized verticals like Solar Installation with professional-grade tools for teams and agencies.
- **Search Tags**: `Gig Economy`, `Local Services`, `Skill Marketplace`, `Hyperlocal`, `Job Posting`, `Service Booking`, `Kenya`, `M-Pesa`, `Freelance`, `Service Provider`, `Solar Installation`, `Team Management`, `Tax Compliance`, `eTIMS`.
- **Product Logo**: 

---

## 2. Description & Details Section

### Your Journey with JustInTime

JustInTime is built for everyone. Whether you're looking to turn your talents into a thriving business or you need a helping hand from someone nearby, getting started is simple and rewarding.

#### 1. Join the Community
Signing up is the first step toward a world of local opportunities. With just an email or your phone number, you can unlock a platform designed to help you connect, collaborate, and grow right where you live.

#### 2. Shape Your Experience
Our intuitive onboarding process helps us understand who you are. 
- **The Provider**: Showcase your skills, upload your portfolio, and let the world know what you're capable of. Our smart platform will then match you with people who need exactly what you offer.
- **The Client**: Tell us what you're interested in. Whether it's home maintenance, tech support, or creative services, we'll make sure you see the best talent in your neighborhood.

#### 3. Connect and Collaborate
Once you're in, the magic happens:
- **Find Your Match**: Use our hyperlocal search to find the perfect person for the job, or post a project and let the experts come to you.
- **Real-Time Conversations**: Chat directly with providers or clients through our secure messaging system. Discuss details, share photos, and agree on the perfect plan.
- **Trust and Safety**: Every member is part of a verified community. We prioritize your security so you can focus on getting the job done.

#### 4. Growth and Success
For providers, JustInTime is more than just a job board; it's a launchpad for your career. Track your earnings, gather glowing reviews, and watch your local reputation soar. For clients, it's about reclaiming your time and supporting the talent in your own backyard.

### Key Features

**Core Platform**
- **Hyperlocal Matching**: Advanced location-based search to find the nearest service providers.
- **Real-time Messaging**: Built-in chat system with socket-io for instant communication.
- **Identity Verification**: Robust onboarding including face detection and document upload.
- **Booking & Scheduling**: Interactive calendar management and easy time-slot selection.
- **Price Negotiation**: Secure bidding and negotiation system for jobs.
- **Secure Payments**: Integrated with IntaSend for local (M-Pesa) and international (Card) payments.
- **Integrated Wallet System**: Deposit, withdrawal, and internal balance capabilities.

**Trust & Safety**
- **TaaS Premium Verification**: Government-verified badge system with trust scores.
- **Verification Badges**: KRA Verified, Police Cleared, ID Verified, Top Rated, and more.
- **Trust Score Tiers**: UNVERIFIED → BASIC → VERIFIED → PREMIUM → ELITE progression.
- **Premium Pricing**: Verified Pros can charge 10-30% more based on tier.
- **SOS / Panic Button**: Real-time location sharing with trusted contacts.
- **Background Checks**: Criminal record verification and continuous monitoring.
- **Dispute Resolution**: Structured mediation for handling issues fairly.

**Professional Tools (SaaS)**
- **Team Management OS**: Multi-user accounts for managing crews and agencies.
- **Job Dispatch**: Create, assign, and track team jobs with real-time status.
- **Payroll Processing**: Automated earnings calculation and payment tracking.
- **AI-Powered Expense Management**: Receipt scanning and expense tracking.

**Tax & Compliance**
- **eTIMS Integration**: Automated KRA-compliant tax invoicing for all transactions.
- **Tax Settings Dashboard**: KRA PIN, VAT registration, and compliance management.
- **Invoice Management**: PDF generation, status tracking, and retry mechanisms.

**Specialized Verticals**
- **Solar & Green Tech**: Dedicated marketplace with estimation calculator.
- **Project Estimation**: Bill-based system sizing, pricing, and ROI calculations.
- **Specialist Certification**: EPRA licenses and professional verification.
- **Equipment Registry**: Tools and inventory tracking.

**Engagement**
- **Referral Program**: "Invite & Earn" system for community growth.
- **Subscription Tiers**: Free, Pro, Business access levels.
- **AI-Powered Matching**: Intelligent recommendations using TensorFlow.
- **Push Notifications**: Real-time alerts via Firebase Cloud Messaging.
- **Community Blog**: Platform news, tips, and success stories.
- **Smart Analytics**: Dashboards for tracking performance and earnings.

### Health Metrics
- **Uptime**: 99.9%
- **Booking Completion Rate**: 95%
- **Average Response Time**: < 30 mins

### Technical Architecture
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion.
- **Backend**: Next.js API Routes (Serverless), Socket.io for real-time, Server Actions.
- **Database**: PostgreSQL with Prisma ORM (40+ models).
- **Authentication**: NextAuth.js (Google, Email, Phone), 2FA security.
- **AI & ML**: TensorFlow.js for intelligent matching and search.
- **Media Hosting**: AWS S3 for documents, Cloudinary for images.
- **Payments**: IntaSend Inline SDK (M-Pesa, Card).
- **Real-time**: Custom Socket.io server.

### Customer Reviews
- **Author Name**: Elvin Ochieng
- **Role / Position**: Lead Developer
- **Rating**: 5 Stars
- **Review Content**: "JustInTime has revolutionized how I find local tasks and manage my service offerings. The location-based matching is incredibly accurate."

- **Author Name**: Sarah Wambui
- **Role / Position**: Small Business Owner
- **Rating**: 5 Stars
- **Review Content**: "Finding reliable help for my business needs used to take days. With JustInTime, I can find someone qualified in my area within minutes."

- **Author Name**: James Mwangi
- **Role / Position**: Solar Installation Company
- **Rating**: 5 Stars
- **Review Content**: "The Solar vertical and team management features transformed our operations. We now dispatch crews and track projects all in one place."

---

## 3. Pricing Section
- **Pricing Model**: Freemium (Commission + Subscription)
- **Revenue Streams**:
    - **Commission**: % fee on completed bookings.
    - **Subscriptions**:
        - **Free**: Basic access, limited applications.
        - **Pro**: Standard fee/month, lower commission, boosted visibility.
        - **Business**: Premium fee/month, zero commission, dedicated support, team features.
    - **Premium Listings**: Paid checks for featured positioning.
    - **Lead Credits**: Pay-per-lead alternative to commission.
    - **Premium Verification** (TaaS): Verified Pros can charge 10-30% premium.

---

## 4. Media Section
- **YouTube Video URL**: 
- **Product Gallery**: 
  - [Screenshot 1]
  - [Screenshot 2]
  - [Screenshot 3]
  - [Screenshot 4]
  - [Screenshot 5]

---

## 5. Key Routes & Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/dashboard` | User dashboard |
| `/dashboard/team` | Team Management OS dashboard |
| `/dashboard/team/members` | Team member management |
| `/dashboard/team/jobs` | Job dispatch center |
| `/dashboard/team/payroll` | Payroll management |
| `/dashboard/verification` | TaaS verification dashboard |
| `/dashboard/invoices` | Invoice management |
| `/dashboard/settings/tax` | Tax settings |
| `/solar` | Solar vertical landing page |
| `/solar/estimate` | Solar estimation calculator |
| `/admin` | Admin dashboard |
