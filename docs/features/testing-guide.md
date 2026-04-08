# JustInTime Evidence-Based Testing Guide (Full Feature Coverage)

This guide replaces assumption-based testing with implementation-backed checks.

Scope:

- Covers all feature groups listed in docs/features/overview.md.
- Uses current code evidence only (routes, actions, APIs, Prisma models, utilities).
- Flags documentation and implementation gaps explicitly instead of guessing behavior.

## 0. Evidence Sources Used

- App Router pages under src/app/\*\*/page.tsx.
- API routes under src/app/api/\*\*/route.ts.
- Server actions under src/app/actions/\*.ts.
- Core domain models in prisma/schema.prisma.
- Core platform modules in src/lib and src/providers.

## 1. Test Execution Protocol (No Hallucination Rules)

1. For each feature, validate at least one implementation anchor before asserting expected behavior.
2. If anchor is route-only, expectation is route availability and UI render/empty-state behavior.
3. If anchor is API/action, expectation is contract behavior (status/result shape), not hypothetical UX.
4. If anchor is model-only, expectation is persistence capability, not guaranteed UI.
5. If no anchor exists, mark as GAP and file follow-up instead of creating fake expectations.

## 2. Environment Setup

```bash
cd /home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime
npm install
npx prisma generate
npm run dev
```

Recommended test identities:

- Client account
- Provider account
- Admin account

## 3. End-to-End Experience Layers

### 3.1 Guest and Discovery Layer

Implementation anchors:

- Public routes: /, /services, /services/[id], /professionals, /professionals/[id], /jobs, /jobs/[id], /about, /faq, /terms, /privacy, /cookie-policy, /contact, /blog, /solar, /solar/estimate.

Test steps:

1. Visit each public route directly.
2. Open browser network panel while loading listing/detail pages.
3. Confirm no route returns 404 for listed pages.

Expected:

- Route renders with either content or explicit empty state.
- Discovery pages do not hard-crash when data is missing.

### 3.2 Authentication and Account Lifecycle

Implementation anchors:

- Routes: /auth/login, /auth/signup, /auth/forgot-password, /auth/reset-password, /auth/verify-email, /auth/error, /auth/verify, /auth/verify-request.
- APIs: /api/auth/signup, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/verify-email, /api/auth/verify-credentials.
- Account deletion APIs: /api/account/request-deletion, /api/account/cancel-deletion, /api/account/cleanup-deletions.

Test steps:

1. Submit signup/login/forgot-password flows with valid and invalid inputs.
2. Call deletion request endpoint while authenticated.
3. Cancel deletion and verify fields reset.
4. Execute cleanup endpoint in test environment only.

Expected:

- Unauthorized calls return 401 where auth is required.
- Request deletion schedules deletion approximately 24 hours ahead and creates notification.
- Cancel deletion clears deletionScheduledAt and deletionReason.

### 3.3 Onboarding and Role Personalization

Implementation anchors:

- Route: /onboarding.
- Components used by flow: StepRoleSelect, StepClientDetails, StepProviderDetails, StepVerification, StepComplete.
- API: /api/users/onboarding.
- Location API: /api/user/location.

Test steps:

1. Complete onboarding as client.
2. Complete onboarding as provider with verification artifacts.
3. Submit invalid payloads directly to /api/users/onboarding.

Expected:

- API validates role, required phone, provider skills and bio constraints.
- Provider onboarding upserts profile and sets verificationStatus to PENDING.
- Duplicate unique fields return conflict path when Prisma unique constraint is triggered.

### 3.4 Role-Specific Workspaces

Implementation anchors:

- Client routes: /client/dashboard, /client/jobs, /client/proposals, /client/bookings, /client/messages, /client/analytics, /client/referral, /client/settings, /client/profile, /client/wallet.
- Provider routes: /dashboard, /dashboard/services, /dashboard/jobs, /dashboard/requests, /dashboard/bookings, /dashboard/availability, /dashboard/earnings, /dashboard/invoices, /dashboard/settings/tax, /dashboard/verification, /dashboard/premium, /dashboard/team, /dashboard/team/jobs, /dashboard/team/members, /dashboard/team/payroll, /dashboard/expenses, /dashboard/safety, /dashboard/reviews, /dashboard/wallet.
- Admin routes: /admin/dashboard, /admin/users, /admin/users/[id], /admin/bookings, /admin/disputes, /admin/verifications, /admin/finance, /admin/support, /admin/logs, /admin/settings, /admin/churn-analysis, /admin/marketing/promos.

Expected:

- Protected routes redirect unauthenticated users to login.
- Workspace pages load with data or controlled fallback states.

## 4. Marketplace and Commerce Core

### 4.1 Services Marketplace

Anchors:

- APIs: /api/services, /api/services/[id], /api/services/[id]/interactions.
- Provider service API: /api/provider/services.

Expectations:

- Service listing and detail endpoints respond without 404.
- Interaction endpoint accepts tracking requests.

### 4.2 Professionals Marketplace

Anchors:

- APIs: /api/professionals, /api/professionals/[id], /api/professionals/[id]/interactions.
- Provider profile API: /api/provider/profile.

Expectations:

- Directory and profile routes resolve.
- Profile data includes verification-related fields when available.

### 4.3 Jobs, Proposals, Negotiation

Anchors:

- APIs: /api/jobs, /api/jobs/[id], /api/jobs/[id]/proposals, /api/jobs/[id]/proposals/[proposalId], /api/proposals, /api/proposals/[id], /api/negotiations, /api/negotiations/[id].
- Actions: acceptProposal, rejectProposal.

Expectations:

- Proposal lifecycle endpoints return deterministic success/error payloads.
- Negotiation endpoints exist and are reachable.

### 4.4 Booking Lifecycle

Anchors:

- Route: /booking.
- APIs: /api/bookings, /api/bookings/[id], /api/bookings/[id]/accept, /api/bookings/[id]/reject.
- Invoice route: /bookings/[id]/invoice.
- Cancellation action: cancelBooking with refund preview action.

Expectations:

- Booking create/get endpoints respond with valid JSON contracts.
- Provider accept/reject operations are available.
- Cancellation flow exposes refund preview then cancellation action path.

## 5. Communication and Engagement Systems

### 5.1 In-App Messaging

Anchors:

- Routes: /dashboard/messages, /client/messages.
- APIs: /api/messages/send, /api/messages/history/[otherUserId], /api/messages/conversations, /api/messages/contacts, /api/messages/clear/[otherUserId], /api/messages/[messageId].
- Components: ChatWindow, ConversationsList, NewConversationModal.

Expectations:

- Send/history/clear/message management endpoints resolve.
- Message pages render conversation and empty-state variants.

### 5.2 Calls and Direct Communication

Anchors:

- Actions: initiateSecureCall, logCallStart, logCallStatus, getCallHistory.
- Components: SecureCallButton, CallOverlay, VideoCallInterface.
- Prisma model: Call exists.

Critical current-state expectation:

- initiateSecureCall references prisma.proxySession, but ProxySession is not present in current schema.
- Test must validate this path fails gracefully and does not crash the page.

### 5.3 Notifications and Omnichannel Alerts

Anchors:

- APIs: /api/notifications, /api/notifications/[id], /api/notifications/mark-all-read, /api/notifications/store-token.
- Admin debug API: /api/admin/debug-notifications.
- FCM hook: src/lib/hooks/useFcmToken.ts.
- WhatsApp webhook: /api/webhooks/whatsapp.

Expectations:

- Notification CRUD and mark-all-read endpoints are reachable.
- Token storage endpoint accepts authenticated token updates.
- WhatsApp webhook GET verifies challenge token and POST accepts Meta event payload shape.

## 6. Trust, Safety, Verification, and Quality

### 6.1 Identity and Verification

Anchors:

- Routes: /auth/verify, /dashboard/verification.
- Actions: submitBackgroundCheck, getProviderBackgroundCheck, approveBackgroundCheck, rejectBackgroundCheck, getExpiringChecks.

Expectations:

- Verification route renders upload workflow.
- Background-check actions persist and change status lifecycle.

### 6.2 Trust-as-a-Service

Anchors:

- Actions: getMyVerificationStatus, requestVerificationBadge, checkMyAutomaticBadges, refreshMyTrustScore, togglePremiumPricing, adminApproveBadge, adminRevokeBadge.
- Utilities: src/lib/taas/trust-score-calculator.ts, src/lib/taas/badge-manager.ts.
- Models: VerificationBadge, TrustScore, VerificationAudit.

Expectations:

- Trust score components are weighted identity 25, conduct 25, performance 20, reliability 15, compliance 15.
- Tier thresholds and premium eligibility follow calculator rules.
- Badge admin actions update badge status history.

### 6.3 Safety Operations

Anchors:

- Route: /dashboard/safety.
- Actions: addTrustedContact, removeTrustedContact, getTrustedContacts, triggerSOS, cancelSOS, getActiveSOS.
- Models: TrustedContact, SOSAlert.

Expectations:

- Trusted contact CRUD works for authenticated provider.
- SOS trigger creates active alert and cancel transitions state.

### 6.4 Disputes and Reviews

Anchors:

- Admin route: /admin/disputes.
- Actions: getDisputes, resolveDispute.
- Reviews API: /api/reviews.
- Client review route: /client/reviews/submit/[bookingId].

Expectations:

- Booking-linked review submission path is available.
- Dispute resolution updates status through admin action.

### 6.5 Insurance and Risk Events

Anchors:

- Actions: submitInsuranceClaim, getClaims.
- Model: InsuranceClaim.

Expectations:

- Claim submission persists claim record.
- Claims retrieval returns authenticated user scope.

## 7. Financial Systems, Billing, and Compliance

### 7.1 Wallet and Transactions

Anchors:

- Routes: /wallet, /client/wallet, /dashboard/wallet/topup-complete.
- APIs: /api/wallet, /api/wallet/balance, /api/wallet/transactions, /api/wallet/topup, /api/wallet/verify, /api/wallet/webhook.

Expectations:

- Wallet summary/balance/transactions endpoints return valid responses.
- Top-up and verify paths are callable and webhook endpoint is available.

### 7.2 Provider Revenue and Monetization

Anchors:

- Actions: purchaseCredits, payOnboardingFee, promoteService.
- APIs: /api/onboarding-fee/initiate, /api/onboarding-fee/webhook.

Expectations:

- Credit purchase reduces wallet balance and increases creditBalance on success.
- Onboarding fee action updates profile.hasPaidOnboardingFee when funds suffice.
- Promotion action sets or extends service promotedUntil.

### 7.3 Subscriptions and Plans

Anchors:

- APIs: /api/subscription/initiate, /api/subscription/status, /api/subscription/webhook.
- Admin action: updateUserPlan.

Expectations:

- Subscription initiation/status/webhook endpoints are reachable and process payloads.
- Admin plan update action exists for governance workflow.

### 7.4 Invoicing and Tax Compliance

Anchors:

- Routes: /dashboard/invoices, /dashboard/settings/tax, /bookings/[id]/invoice.
- Actions: createInvoiceForBooking, getInvoice, getInvoiceHistory, getInvoiceStats, retryInvoiceSubmission, calculateTaxPreview.
- Tax actions: verifyAndSaveKraDetails, fileNilReturnAction, getTaxFilings, getTaxProfile.
- Tax settings actions: getTaxSettings, updateTaxSettings, verifyKRAPin, getTaxComplianceStatus.
- Utilities: src/lib/etims/tax-calculator.ts.

Expectations:

- Tax calculator uses VAT 16 percent, Excise 2.5 percent, Withholding 5 percent.
- KRA PIN format validation requires letter + 9 digits + letter.
- Invoice retry action path is available for failed submission records.

### 7.5 Promo and Growth Revenue

Anchors:

- Actions: validatePromoCodeAction, createPromoCodeAction.
- Admin route: /admin/marketing/promos.
- Components: PromoList, CreatePromoModal.

Expectations:

- Promo creation and validation actions are callable.
- Admin promo module loads and lists promo records.

## 8. Provider Business OS

### 8.1 Profile and Service Operations

Anchors:

- Provider APIs: /api/provider/profile, /api/provider/services, /api/provider/activities, /api/provider/stats.
- Provider routes: /dashboard/profile, /dashboard/services.

Expectations:

- Provider can fetch/update profile and service records through exposed APIs.

### 8.2 Availability and Scheduling

Anchors:

- APIs: /api/provider/availability, /api/provider/availability/month, /api/provider/availability/check, /api/provider/availability/exceptions.
- Route: /dashboard/availability.

Expectations:

- Weekly/monthly availability and exception endpoints are reachable.
- Slot check endpoint returns conflict-safe availability response.

### 8.3 Earnings and Analytics

Anchors:

- APIs: /api/provider/earnings, /api/provider/earnings/chart, /api/provider/reviews.
- Routes: /dashboard/earnings, /dashboard/analytics.

Expectations:

- Earnings summaries and chart data endpoints respond.

### 8.4 Expense Intelligence

Anchors:

- Route: /dashboard/expenses.
- Actions: createExpense, getExpenses, scanReceipt, deleteExpense.

Expectations:

- Expense CRUD action flows complete successfully.
- Receipt scan action returns parse result or controlled error state.

## 9. Team and Agency Management OS

### 9.1 Team Structure

Anchors:

- Routes: /dashboard/team, /dashboard/team/members.
- Actions: createTeam, getMyTeam, inviteTeamMember or addMember, removeTeamMember, updateMemberPermissions, updateMemberLocation, updateMemberStatus.
- Models: Team, TeamMember.

Expectations:

- Team can be created by provider account.
- Member lifecycle operations are executable.

### 9.2 Team Job Dispatch

Anchors:

- Route: /dashboard/team/jobs.
- Actions: createJob, assignMembersToJob, updateJobStatusAction, markJobAsCollected, getTodaysJobsAction, getTodaysCollectionsAction.
- Models: TeamJob, TeamJobAssignment.

Expectations:

- Job creation, assignment, and status transitions are persisted.
- Collection recording updates dashboard aggregates.

### 9.3 Team Earnings and Payroll

Anchors:

- Route: /dashboard/team/payroll.
- Actions: generatePayrollAction, processPayrollAction, getPendingPayrollAction, getMemberBalanceAction.
- Utilities: src/lib/teams/earnings-calculator.ts, src/lib/teams/payroll-processor.ts.
- Models: TeamEarning, TeamPayroll.

Expectations:

- Payroll generation creates pending payroll entries.
- Processing payroll updates status and records process metadata.

### 9.4 Team Coordination

Anchors:

- Model: TeamAnnouncement.
- Team components: MemberCard, TeamMemberList.

Expectation:

- Team coordination data model exists even if announcement UI flow is limited.

## 10. AI, Analytics, Gamification, and Retention

### 10.1 Matching and Recommendations

Anchors:

- Hooks/utilities: src/lib/hooks/useRecommendations.ts, src/lib/utils/geolocation.ts, src/lib/sheng-normalizer.ts.

Expectations:

- Recommendation and geolocation helpers are importable and functional.
- Sheng normalization maps slang to normalized terms for search inputs.

### 10.2 Dynamic Pricing

Anchors:

- Utility: src/lib/pricing-engine.ts.
- Route: /dashboard/surge-pricing-demo.

Expectation:

- Surge pricing demo route loads and executes pricing logic without crash.

### 10.3 Churn Prediction

Anchors:

- Route: /admin/churn-analysis.
- Actions: getAtRiskUsers, getUserChurnScore, triggerChurnAnalysis, createManualIntervention, triggerUserReEngagement, getInterventionStats.
- Utilities: src/lib/churn/churn-predictor.ts, src/lib/churn/re-engagement.ts.
- Models: ChurnScore, ChurnIntervention.

Expectation:

- Admin churn workflows execute through actions and surface at-risk cohorts.

### 10.4 Gamification and Loyalty

Anchors:

- Actions: getUserBadges, getBadgeProgress, syncBadges, manuallyAwardBadge.
- Loyalty actions: getLoyaltyStatus, getPointHistory, getAvailablePartnerRewards, redeemPartnerReward, getRedemptionHistory, getLoyaltyLeaderboard.
- Models: Badge, UserBadge, UserLoyalty, LoyaltyPointTransaction, Partner, PartnerReward, RewardRedemption.

Expectations:

- Badge and loyalty retrieval endpoints/actions return deterministic structures.
- Reward redemption creates redemption history entries when validation passes.

## 11. Specialized Vertical: Solar and Green Tech

### 11.1 Solar Discovery and Estimation

Anchors:

- Routes: /solar, /solar/estimate.
- Actions: getQuickSolarEstimate, getDetailedSolarEstimate.
- Utility: src/lib/solar/estimation-calculator.ts.

Expectations:

- Stepper on /solar/estimate progresses through bill input, configuration, results.
- Quick estimate supports bill presets such as 10000, 15000, 25000.
- Detailed estimate returns system sizing, cost breakdown, savings and payback fields.

### 11.2 Specialist and Certification Workflows

Anchors:

- Actions: registerAsSolarSpecialist, submitCertification, getFeaturedSolarSpecialists.
- Models: VerticalSpecialist, VerticalCertification.

Expectations:

- Specialist registration and certification submission actions persist data.
- Featured specialist retrieval returns limited result set.

### 11.3 Solar Project Lifecycle

Anchors:

- Actions: requestSolarQuote, getMySolarProjects, updateProjectStatus.
- Models: VerticalProject, ProjectMilestone, EquipmentRegistry, ProjectTemplate, SolarEstimationConfig.

Expectations:

- Project creation and status update action paths are available.
- Milestone and equipment models support project tracking persistence.

## 12. Referral, Support, and Customer Care

Anchors:

- Referral API and route: /api/client/referral, /client/referral.
- Support APIs: /api/support/tickets, /api/support/tickets/[id].
- Admin support route: /admin/support.
- Growth APIs: /api/contact, /api/newsletter/subscribe.

Expectations:

- Referral data is retrievable by authenticated client.
- Support ticket create/update endpoints return valid success/error contracts.

## 13. Admin Command Center

### 13.1 User Governance

Anchors:

- Admin actions: getUsers, getUserDetails, updateUserRole, updateUserPlan, toggleBanUser, verifyProvider.
- Fee waiver API: /api/admin/users/[id]/waive-fee.

Expectations:

- User governance actions function from admin context.

### 13.2 Financial Governance

Anchors:

- Admin actions: getFinanceSummary, getTransactions, getWallets, processManualRefund.
- Route: /admin/finance.

Expectations:

- Finance summary and transaction/wallet tables load from action data.

### 13.3 Trust and Compliance Governance

Anchors:

- Admin routes: /admin/verifications, /admin/logs.
- Actions: getBackgroundChecks, getExpiringChecks, getExpiringBadgesAdmin, getAdminLogs.

Expectations:

- Verification and compliance queues are queryable.

### 13.4 Category and Platform Configuration

Anchors:

- API: /api/categories.
- Admin actions: getCategories, createCategory, updateCategory, deleteCategory, getSystemSettings, updateSystemSetting.
- Route: /admin/settings.

Expectations:

- Category CRUD and system-setting update flows are available.

## 14. Platform Foundations and Integrations

### 14.1 Technical Stack

Anchors:

- Next.js App Router layout with server actions.
- Prisma schema and generated client in src/generated/prisma.
- NextAuth route: /api/auth/[...nextauth].

Expectation:

- Application boots with current schema and auth wiring.

### 14.2 Real-Time and Offline Resilience

Anchors:

- Socket singleton: src/lib/socket.ts.
- Offline provider: src/providers/OfflineSyncProvider.tsx.
- Notification permission overlay + FCM hooks.

Expectations:

- In production, socket endpoint resolves to configured non-localhost endpoint or Render fallback.
- Offline provider displays offline indicator and sync queue status.

### 14.3 External Integrations

Anchors:

- Daraja: src/lib/daraja.ts, src/lib/daraja-webhook.ts, and webhook routes.
- Firebase: src/lib/firebase.ts, src/lib/firebase-admin.ts.
- WhatsApp: src/lib/whatsapp-service.ts and /api/webhooks/whatsapp.
- Object storage: src/lib/s3.ts and /api/upload.
- eTIMS and KRA: src/lib/etims/\* plus tax actions.
- Gava utility: src/lib/gava.ts.

Expectations:

- Integration routes/modules load with environment-dependent behavior.
- Upload route restricts folders to allowed list and rejects unauthenticated requests.

### 14.4 Internationalization and Local Context

Anchors:

- i18n routing locales: en, sw, sheng.
- Message packs: messages/en.json, messages/sw.json, messages/sheng.json.
- Local normalization: src/lib/sheng-normalizer.ts.

Expectations:

- Locale fallback defaults to en when unsupported locale is requested.

## 15. Data Domain Coverage (Prisma)

Current schema contains the key domains listed in the overview, including:

- Auth and identity models.
- Marketplace and booking models.
- Trust, support, and safety models.
- Financial, invoicing, tax, and wallet models.
- Team OS models.
- TaaS models.
- Vertical solar models.

Test expectation:

- For each critical workflow above, verify at least one create and one read operation against corresponding model-backed feature path.

## 16. Gaps Found During Evidence Review

These are factual mismatches to test and track:

1. initiateSecureCall action depends on prisma.proxySession, but ProxySession model is not present in prisma/schema.prisma.
2. Verification page contains link to /dashboard/sos, while current route is /dashboard/safety.
3. Provider onboarding page links to /dashboard/calendar, but this route is not present in current page inventory.
4. Solar provider dashboard routes referenced in older docs (/dashboard/solar\*) are not present as pages; solar specialist/project flows currently surface through actions and public solar routes.

## 17. Exhaustive Execution Checklist (Overview-Aligned)

- [ ] 1. End-to-end experience layers
- [ ] 2. Marketplace and commerce core
- [ ] 3. Communication and engagement systems
- [ ] 4. Trust, safety, verification, and quality
- [ ] 5. Financial systems, billing, and compliance
- [ ] 6. Provider business OS
- [ ] 7. Team and agency management OS
- [ ] 8. AI, analytics, gamification, and retention
- [ ] 9. Specialized vertical: solar and green tech
- [ ] 10. Referral, support, and customer care
- [ ] 11. Admin command center
- [ ] 12. Platform foundations and integrations
- [ ] 13. Data domain coverage
- [ ] 14. Canonical route index validation
- [ ] 15. Strategic module validation

Use this checklist repeatedly for each release until all boxes remain green across smoke, regression, and role-based test runs.
