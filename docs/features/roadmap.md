# JustInTime Strategic Features Roadmap

> **Vision:** Transform from a "matching marketplace" to a **Business Upgrade Platform** - the Compliance and Safety Layer for Kenya's informal economy.

---

## Feature 1: Fiscal Moat - eTIMS Gatekeeper ✅

**Goal:** Become the automatic tax-compliance layer that makes JustInTime indispensable for both Pros and corporate clients.

### Database Schema
- [x] `Invoice` model with eTIMS fields (invoice number, QR code, tax breakdown)
- [x] `TaxSettings` model for user tax preferences
- [x] `ETIMSSubmission` audit log for KRA sync status

### Backend/API
- [x] KRA eTIMS API integration service
- [x] Automatic invoice generation on booking completion
- [x] Tax calculation engine (VAT, Excise Duty, Withholding)
- [x] Invoice PDF generator (structure ready)
- [x] `/api/invoices` CRUD routes
- [x] `/api/etims/sync` webhook for KRA callbacks

### UI Components
- [x] Invoice generation wizard (auto from booking)
- [x] Invoice history/download page (`/dashboard/invoices`)
- [x] Tax settings configuration panel (`/dashboard/settings/tax`)
- [x] "Tax-Compliant" badge on provider profiles
- [x] Client dashboard showing deductible expenses

### Key Deliverables
1. ✅ Auto-generate KRA-compliant invoice on every completed booking
2. ✅ Client can download tax-deductible invoice PDF with QR
3. ✅ Provider sees their fiscal status dashboard

---

## Feature 2: Small Agency SaaS - Team Management OS ✅

**Goal:** Transform "Super Fundis" (team leaders with apprentices) into paying SaaS users by becoming their operating system.

### Database Schema
- [x] `Team` model (name, owner, settings, defaultSplit)
- [x] `TeamMember` model (role: OWNER, ADMIN, MEMBER, status, location)
- [x] `TeamJob` model (assignments, location tracking, client info)
- [x] `TeamJobAssignment` model (worker dispatch)
- [x] `TeamEarning` model (revenue splits, collections)
- [x] `TeamPayroll` model (weekly/monthly settlements)
- [x] `TeamAnnouncement` model (team communication)

### Backend/API
- [x] Team CRUD operations
- [x] Member invitation/removal system
- [x] Job assignment and dispatch logic (`job-dispatcher.ts`)
- [x] Location tracking aggregation service
- [x] Earnings split calculator (`earnings-calculator.ts`)
- [x] Payroll processor (`payroll-processor.ts`)
- [x] Server actions for all operations

### UI Components
- [x] Team dashboard with member status (`/dashboard/team`)
- [x] Job dispatch/assignment panel (`/dashboard/team/jobs`)
- [x] Earnings overview (who collected what today)
- [x] Idle/Active member indicators (MemberCard)
- [x] Payroll settlement interface (`/dashboard/team/payroll`)
- [x] Member management (`/dashboard/team/members`)

### Key Deliverables
1. ✅ Lead Fundi can see team members and their status
2. ✅ Track M-Pesa/Cash/Card collections by team member
3. ✅ Weekly payroll auto-calculation and processing

---

## Feature 3: Trust-as-a-Service (TaaS) - Premium Verification ✅

**Goal:** Create a "Government-Verified" premium tier where verified Pros can charge 20-30% more.

### Database Schema
- [x] `VerificationBadge` model (8 badge types: KRA, GOOD_CONDUCT, SOS, ID, SKILLS, INSURANCE, TOP_RATED, PREMIUM)
- [x] `TrustScore` model (5 score components + tier system + premium pricing)
- [x] `VerificationAudit` history log
- [x] Premium pricing fields in Profile model

### Backend/API
- [x] Trust score calculator (`trust-score-calculator.ts`) with weighted scoring algorithm
- [x] Badge manager (`badge-manager.ts`) for badge lifecycle and auto-granting
- [x] Automatic badge checks (SOS_ENABLED, TOP_RATED, KRA_VERIFIED)
- [x] Badge expiry management and renewal
- [x] Server actions for all TaaS operations

### UI Components
- [x] "Government-Verified ✓" premium badge component
- [x] Verification status page with checklist (`/dashboard/verification`)
- [x] Trust score display with 5-component breakdown
- [x] Premium pricing toggle for verified Pros
- [x] Tier badges (UNVERIFIED → BASIC → VERIFIED → PREMIUM → ELITE)

### Key Deliverables
1. ✅ Verified badge combining: KRA PIN ✓, Good Conduct ✓, SOS-enabled ✓, etc.
2. ✅ Verified Pros can enable "Premium Pricing" (+10% to +30% based on tier)
3. ✅ Trust Score tiers with eligibility criteria

---

## Feature 4: Hyper-Niche Vertical Launch - Solar & Green Tech ✅

**Goal:** Dominate one high-value vertical before expanding, building reputation as "The Solar Pros."

### Database Schema
- [x] `VerticalCategory` model (Solar, HVAC, Security, EV_CHARGING, etc.)
- [x] `VerticalCertification` model (EPRA licenses, etc.)
- [x] `VerticalSpecialist` model (specialist profiles with ratings)
- [x] `EquipmentRegistry` model (tools/inventory tracking)
- [x] `ProjectTemplate` model (solar-specific job flows)
- [x] `VerticalProject` model (full project lifecycle)
- [x] `ProjectMilestone` model (progress tracking)
- [x] `SolarEstimationConfig` model (pricing configuration)

### Backend/API
- [x] Solar estimation calculator (`estimation-calculator.ts`)
- [x] System sizing based on monthly bill
- [x] ROI and payback calculations
- [x] Server actions for specialist onboarding, certifications, projects

### UI Components
- [x] Solar landing page (`/solar`) with trust badges
- [x] Project estimation wizard (`/solar/estimate`)
- [x] Featured installers showcase
- [x] Step-by-step system configuration

### Key Deliverables
1. ✅ Dedicated "JustInTime Solar" landing section
2. ✅ Specialized onboarding for solar technicians  
3. ✅ Project estimation tool for clients (bill → system size → pricing → ROI)
4. ✅ Installer certification and verification workflow

---

## Implementation Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| **eTIMS Gatekeeper** | High | Very High | 🔴 P0 - Do First |
| **Team Management OS** | High | High | 🟠 P1 - Phase 2 |
| **Trust-as-a-Service** | Medium | Very High | 🔴 P0 - Do First |
| **Solar Vertical** | Medium | Medium | 🟡 P2 - After Foundation |

---

## Quick Start Commands

Once you're ready to implement, prompt with:

1. `Implement Feature 1: eTIMS Gatekeeper`
2. `Implement Feature 2: Team Management OS`
3. `Implement Feature 3: TaaS Premium Verification`
4. `Implement Feature 4: Solar Vertical`

Each feature will be built with:
- ✅ Database migrations
- ✅ Backend API routes
- ✅ Server actions
- ✅ UI components
- ✅ Integration tests

---

## Success Metrics

| Feature | KPI |
|---------|-----|
| eTIMS | % of bookings with auto-invoice |
| Team OS | # of teams with 3+ active members |
| TaaS | % of Pros achieving "Verified" badge |
| Solar | # of solar installations completed |

---

> **Remember:** You're not selling "jobs" to Pros - you're selling **Professionalism**. Make an informal worker look like a formal corporation.
