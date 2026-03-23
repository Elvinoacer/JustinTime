# JustInTime - Manual Testing Roadmap

This document provides a comprehensive testing guide for all newly implemented strategic features. Use this to manually verify each feature before production deployment.

## Pre-Testing Requirements

### 1. Database Migration
```bash
cd /home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime
npx prisma migrate dev --name strategic_features_migration
npx prisma generate
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test User Setup
- Create a **Provider** account (for testing provider features)
- Create a **Client** account (for testing client features)
- Have **Admin** access (for admin verification features)

---

## Feature 1: eTIMS Gatekeeper (Tax Compliance)

### Test Route: `/dashboard/invoices`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Invoice Dashboard** | 1. Login as Provider 2. Navigate to `/dashboard/invoices` | Dashboard loads with invoice list, stats cards, filter options |
| **Create Invoice** | 1. Complete a booking 2. Check invoice auto-generation | Invoice created with tax breakdown (VAT, digital service tax) |
| **View Tax Breakdown** | 1. Click on any invoice | Modal shows base, VAT (16%), excise, withholding tax breakdown |
| **Retry Failed Invoice** | 1. Find invoice with FAILED status 2. Click retry | Invoice attempts re-submission, status updates |
| **Filter Invoices** | 1. Use status filter (PENDING, SUBMITTED, FAILED) | List updates to show only filtered invoices |

### Test Route: `/dashboard/settings/tax`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Tax Settings** | 1. Login as Provider 2. Go to Settings > Tax | Tax settings page loads with KRA PIN form |
| **Save KRA PIN** | 1. Enter KRA PIN (format: A123456789B) 2. Toggle VAT if applicable 3. Save | Settings saved, success message shown |
| **Verify KRA PIN Status** | 1. Check verification badge | Shows verified/pending status |

### Breakpoint Check
> ⚠️ **Known Issue**: Ensure Invoice model has all required tax fields in schema. Check for `taxBreakdown`, `exciseAmount`, `vatAmount` fields.

---

## Feature 2: Team Management OS

### Test Route: `/dashboard/team`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Team Dashboard** | 1. Login as Provider 2. Navigate to `/dashboard/team` | Dashboard shows team stats, member cards, earnings overview |
| **Create Team** | 1. Click "Create Team" if no team exists 2. Enter team name | Team created, redirected to dashboard |

### Test Route: `/dashboard/team/members`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Members** | 1. Go to Members tab | List of team members with roles and status |
| **Invite Member** | 1. Click "Invite Member" 2. Enter email 3. Select role (ADMIN/DISPATCHER/MEMBER) | Invitation sent, member appears as INVITED |
| **Change Member Role** | 1. Click member menu 2. Select new role | Role updated, permissions change accordingly |
| **Remove Member** | 1. Click remove 2. Confirm | Member removed from team |

### Test Route: `/dashboard/team/jobs`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Team Jobs** | 1. Go to Jobs tab | List of team jobs with status filters |
| **Create Job** | 1. Click "Create Job" 2. Fill title, description, amount 3. Save | Job created with PENDING status |
| **Assign Job** | 1. Select job 2. Choose team member 3. Assign | Job assigned, member notified |
| **Update Job Status** | 1. Change status to IN_PROGRESS → COMPLETED | Status updates, earnings recorded |
| **Collect Payment** | 1. Mark job as collected | Collection recorded with amount and method |

### Test Route: `/dashboard/team/payroll`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Payroll** | 1. Go to Payroll tab | Payroll summary with member earnings |
| **Generate Payroll** | 1. Select period 2. Click "Generate" | Payroll calculated based on earnings split |
| **Process Payment** | 1. Click "Process" on pending payroll | Status changes to PROCESSED |
| **View History** | 1. Check payroll history | Past payroll records displayed |

### Breakpoint Check
> ⚠️ **Known Issue**: Verify `TeamJob`, `TeamEarning`, `TeamPayroll` models exist in schema. Check for relations between Team, TeamMember, and User.

---

## Feature 3: TaaS Premium Verification

### Test Route: `/dashboard/verification`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Trust Score** | 1. Login as Provider 2. Navigate to `/dashboard/verification` | Trust Score display with 5 components (Identity, Conduct, Performance, Reliability, Compliance) |
| **View Badge Checklist** | 1. Scroll to verification checklist | List of 8 badge types with status indicators |
| **Request Badge** | 1. Click "Upload" on a badge (e.g., GOOD_CONDUCT) 2. Upload document | Badge status changes to PENDING |
| **Auto-Badge Check** | 1. Click "Refresh Status" | Automatic badges (SOS, TOP_RATED, KRA) checked and granted |
| **View Tier** | 1. Check tier display | Shows UNVERIFIED/BASIC/VERIFIED/PREMIUM/ELITE |
| **Enable Premium Pricing** | 1. If eligible, toggle "Enable Premium" | Premium pricing activated with multiplier |

### Verification Badges to Test

| Badge | How to Obtain | Verification |
|-------|---------------|--------------|
| KRA_VERIFIED | Settings > Tax > Verify KRA PIN | Automatic after KRA verified |
| GOOD_CONDUCT | Upload Police Good Conduct Certificate | Admin approval required |
| IDENTITY_VERIFIED | Upload National ID | Admin approval required |
| SOS_ENABLED | Add 2+ trusted contacts in SOS settings | Automatic |
| TOP_RATED | Get 4.8+ rating with 50+ reviews | Automatic |
| SKILLS_CERTIFIED | Upload professional certificate | Admin approval required |

### Trust Score Components

| Component | Weight | Factors |
|-----------|--------|---------|
| Identity | 25% | KRA verified + ID verified + complete profile |
| Conduct | 25% | Good conduct badge + background check + SOS enabled |
| Performance | 20% | Average rating + review count |
| Reliability | 15% | Completion rate + low cancellation |
| Compliance | 15% | KRA PIN + VAT + insurance + certifications |

### Breakpoint Check
> ⚠️ **Known Issue**: TrustScore and VerificationBadge relations must exist on User model. Check Profile model for `premiumPricingEnabled` and `premiumMultiplier` fields.

---

## Feature 4: Solar & Green Tech Vertical

### Test Route: `/solar`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **View Solar Landing** | 1. Navigate to `/solar` | Solar branded landing page with hero, benefits, featured installers |
| **View Featured Installers** | 1. Scroll to installers section | Grid of verified solar specialists with ratings |
| **Quick Estimate** | 1. Enter monthly bill 2. Click "Calculate" | Redirects to estimation page |

### Test Route: `/solar/estimate`

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **Step 1: Bill Entry** | 1. Enter monthly electricity bill (e.g., 15000 KES) 2. Click Continue | Moves to Step 2 |
| **Step 2: System Config** | 1. Select property type 2. Choose panel type 3. Toggle battery 4. Click "Get Estimate" | Calculation runs |
| **Step 3: View Results** | 1. Review system specs | Shows kW, panel count, battery capacity |
| **View Cost Breakdown** | 1. Check pricing section | Panels, inverter, battery, labor, total costs |
| **View Savings** | 1. Check savings section | Monthly savings, payback years, 20-year ROI |
| **Adjust Options** | 1. Click "Adjust Options" | Returns to Step 2 with current values |

### Estimation Calculations to Verify

| Monthly Bill | Expected System | Approx. Price Range |
|--------------|-----------------|---------------------|
| KES 10,000 | ~3 kW | KES 250K - 500K |
| KES 15,000 | ~5 kW | KES 400K - 800K |
| KES 25,000 | ~8 kW | KES 650K - 1.3M |

### Specialist Features (Provider)

| Test Case | Route | Expected Result |
|-----------|-------|-----------------|
| **Register as Specialist** | `/dashboard/solar` | Form to enter experience, specializations, equipment |
| **Submit Certification** | `/dashboard/solar/certifications` | Upload EPRA license, await admin approval |
| **View Projects** | `/dashboard/solar/projects` | List of solar project requests |

### Breakpoint Check
> ⚠️ **Known Issue**: Ensure VerticalCategory with type 'SOLAR' exists in database. Run seed script if needed. Check SolarEstimationConfig for pricing configuration.

---

## Known Issues & Breakpoints Summary

### Critical (Must Fix Before Testing)

| Issue | File | Fix |
|-------|------|-----|
| ✅ Fixed | `settings/page.tsx:196` | Removed duplicate closing brace |

### Pre-existing (Not from Features 1-4)

| Issue | Description | Impact |
|-------|-------------|--------|
| Next.js 15 Params | API routes need async params | Message routes may fail |
| ProxySession missing | Model not in schema | Phone anonymization disabled |
| Schema fields mismatch | Some fields changed in schema | Need migration |

### Migration Required

Before testing, run:
```bash
npx prisma migrate dev --name strategic_features_migration
```

This will create tables for:
- Invoice enhancements (tax fields, eTIMS status)
- Team models (TeamJob, TeamEarning, TeamPayroll, TeamAnnouncement)
- TaaS models (VerificationBadge, TrustScore, VerificationAudit)
- Solar models (VerticalCategory, VerticalCertification, VerticalSpecialist, EquipmentRegistry, ProjectTemplate, VerticalProject, ProjectMilestone, SolarEstimationConfig)

---

## Testing Checklist

### eTIMS Gatekeeper
- [ ] Invoice dashboard loads
- [ ] Tax breakdown displays correctly
- [ ] Tax settings can be saved
- [ ] Invoice PDF generation works

### Team Management OS
- [ ] Team dashboard loads
- [ ] Can create/invite team members
- [ ] Can create and assign jobs
- [ ] Earnings calculation works
- [ ] Payroll generation works

### TaaS Premium Verification
- [ ] Verification dashboard loads
- [ ] Trust score displays correctly
- [ ] Badge request works
- [ ] Automatic badges granted
- [ ] Premium pricing toggle works

### Solar & Green Tech
- [ ] Solar landing page loads
- [ ] Estimation calculator works
- [ ] All three steps complete
- [ ] ROI calculations are reasonable
- [ ] Featured installers display

---

## Post-Testing

After all tests pass:
1. ✅ Mark features as tested in STRATEGIC_FEATURES_ROADMAP.md
2. ✅ Deploy migration to staging
3. ✅ Run smoke tests on staging
4. ✅ Deploy to production
