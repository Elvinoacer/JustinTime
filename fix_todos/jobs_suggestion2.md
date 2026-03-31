# Jobs Growth Optimization Plan (Execution-Ready)

Last updated: 2026-03-30
Mode: Product maturation and growth optimization

## 1) What Success Looks Like (90 days)

Primary business outcomes:

- Increase client job posting completion rate.
- Increase provider application rate per open job.
- Increase hire conversion from proposals.
- Reduce time-to-first-proposal.
- Improve 30-day client and provider retention.

Target metric deltas (set baseline from current analytics in week 1):

- Job post completion rate: +20% to +30%.
- Provider apply rate per viewed job: +15% to +25%.
- Proposal-to-hire conversion: +10% to +20%.
- Median time to first proposal: -25%.
- 30-day retention (both sides): +8% to +15%.

Guardrail metrics:

- Dispute rate does not increase >2pp.
- Cancellation rate does not increase >2pp.
- Support tickets per 100 bookings does not increase >15%.

## 2) Prioritization Framework

Use this scoring for every candidate change:

- Impact (1-5): expected effect on core funnel.
- Effort (1-5): engineering and UX complexity.
- Confidence (1-5): confidence based on evidence.
- Score: (Impact \* Confidence) / Effort.

Execution rule:

- Only ship items with score >= 3.0 unless required for technical dependency.

## 3) Funnel and Event Instrumentation (Do First)

Critical funnel steps to track:

- Client: job form start -> minimal post submitted -> full details completed -> first proposal received -> proposal viewed -> hire made.
- Provider: job viewed -> apply started -> apply submitted -> shortlisted/accepted.

Required events (minimum):

- job_post_started
- job_post_minimal_submitted
- job_post_details_completed
- job_post_published
- proposal_first_received
- proposal_card_viewed
- proposal_compare_opened
- proposal_accepted
- provider_apply_started
- provider_apply_submitted
- pricing_hint_seen
- pricing_hint_applied
- risk_badge_seen

Required properties:

- userRole, jobCategory, budgetBand, locationBand, sourcePage, experimentVariant, timestamp.

Definition of done for instrumentation:

- Event schema documented.
- Events emitted for web production path.
- Dashboard has conversion by step and by segment.

## 4) 12-Week Roadmap (Strict Order)

### Weeks 1-2: Friction Removal (Highest ROI)

1. Quick Post

- Scope:
  - Minimal form: title, budget, location.
  - Submit as OPEN_MINIMAL or DRAFT_OPEN.
  - Immediate success state with prompt to enrich details.
- UX copy:
  - "Your job is live. Add details to get better proposals."
- Acceptance criteria:
  - Minimal form can publish in <=60 seconds median.
  - At least 70% of users see enrichment prompt.
- KPI focus:
  - job_post_minimal_submitted / job_post_started.

2. Quick Apply + Templates

- Scope:
  - One-click apply using profile defaults.
  - Template library: budget, premium, fast delivery.
  - Save/edit reusable templates.
- Acceptance criteria:
  - Apply action from job card in <=2 clicks.
  - Template insertion reduces proposal compose time by >=30% median.
- KPI focus:
  - provider_apply_submitted / provider_apply_started.

3. Feedback Loop Clarity

- Scope:
  - Immediate post-action feedback on both sides.
  - State messages: job live, providers notified, expected response window.
- Acceptance criteria:
  - Every core action has inline success state plus next-step CTA.
- KPI focus:
  - Day-7 return rate after first job post or first apply.

### Weeks 3-4: Decision Intelligence (Conversion Layer)

4. Hiring Labels

- Scope:
  - Surface existing scoring as user-facing labels:
    - Best Value
    - Fastest Delivery
    - Most Reliable
    - Lowest Cost
- Acceptance criteria:
  - Labels appear on proposal list and compare panel.
  - Label logic documented and deterministic.
- KPI focus:
  - proposal_accepted / proposal_card_viewed.

5. Risk Framing

- Scope:
  - Explain risk context with neutral language:
    - New provider profile
    - Consistent delivery history
    - Low response behavior
- Acceptance criteria:
  - Each risk badge has tooltip explaining meaning and action.
- KPI focus:
  - Hire confidence proxy: lower dwell time before acceptance without higher disputes.

6. Smart Pricing Guidance

- Scope:
  - Typical price band for similar jobs.
  - "Your bid is below/within/above typical range" guidance for providers.
- Acceptance criteria:
  - Pricing hint available on proposal compose path.
  - Outlier bids trigger non-blocking warning.
- KPI focus:
  - Bid distribution variance decreases.
  - proposal acceptance rate increases.

### Month 2: Retention and Marketplace Health

7. Win Probability Indicator

- Scope:
  - Show provider a simple chance indicator (high/medium/low) on job cards.
  - Inputs: applicant count, category competitiveness, budget alignment, client responsiveness.
- Acceptance criteria:
  - Indicator updates daily or on significant state changes.
- KPI focus:
  - Apply rate increase on high-probability jobs.

8. Job Quality Score

- Scope:
  - Badge on jobs: high quality, medium quality, low detail.
  - Inputs: description completeness, budget realism, client history.
- Acceptance criteria:
  - Quality scoring transparent via tooltip.
- KPI focus:
  - Faster first proposal for high-quality jobs.

9. Lightweight Reputation Levels

- Scope:
  - Level 1/2/3 with simple progression based on completed jobs and success rate.
- Acceptance criteria:
  - Level displayed on proposal cards and provider profile summary.
- KPI focus:
  - Provider retention and repeat hire rate.

### Month 3: Differentiation

10. Team-Marketplace Integration

- Scope:
  - Allow provider-team routing for accepted marketplace jobs.
  - Internal assignment with accountability trail.
- Acceptance criteria:
  - Assignment state visible to client at milestone level.
- KPI focus:
  - Capacity utilization and completion reliability.

11. AI Assistant (Lightweight First)

- Provider tools:
  - Draft proposal
  - Improve proposal clarity
  - Suggest pricing
- Client tools:
  - Summarize proposals
  - Highlight top candidates
- Acceptance criteria:
  - AI output always editable and clearly marked as assistive.
- KPI focus:
  - Proposal quality and decision speed.

## 5) Experiment Design (How to Ship Safely)

For each major item, run A/B when possible:

- Control: current UX.
- Variant: new UX.
- Minimum sample size: defined by analytics owner before launch.
- Decision rule:
  - Ship if primary KPI improves and guardrails remain within thresholds.

Recommended initial experiments:

- Quick Post vs current post flow.
- Quick Apply templates vs full compose only.
- Hiring labels on vs off.
- Pricing guidance on vs off.

## 6) Operational Cadence

Weekly cycle:

- Monday: choose highest-scoring item, finalize scope and KPI.
- Tuesday-Thursday: build and QA.
- Friday: release to staged cohort, monitor dashboard and guardrails.

Review ritual:

- Weekly growth review with product, engineering, and support.
- Monthly roadmap re-prioritization based on measured results.

## 7) Risks and Mitigations

Risk: Too many features at once dilute impact.

- Mitigation: one primary KPI owner per shipped item; no parallel major launches in same funnel step.

Risk: Trust signals can bias unfairly.

- Mitigation: use explainable, neutral labels and appeal/review path for provider reputation artifacts.

Risk: Smart pricing may anchor too aggressively.

- Mitigation: show ranges, not hard recommendations; keep user control explicit.

## 8) Immediate Next 10 Working Days

1. Finalize baseline dashboards and event schema.
2. Ship Quick Post v1 behind feature flag.
3. Ship Quick Apply with 3 templates behind feature flag.
4. Add feedback-loop status messaging for post/apply actions.
5. Start A/B tests for Quick Post and Quick Apply.
6. Prepare hiring label UI using existing scoring outputs.

## 9) Definition of Effective Execution

This plan is effective only if:

- Every shipped change maps to a KPI.
- Every KPI is measurable via events and dashboard.
- Every release has a go/no-go decision based on data.
- Monthly roadmap is adjusted by outcomes, not assumptions.

## 10) Week 1-2 Sprint Ticket Backlog (Mapped to Codebase)

Sprint objective:

- Ship Quick Post v1, Quick Apply templates v1, and feedback-loop clarity with measurable funnel instrumentation.

### EPIC A: Quick Post v1

JG-101 - Add minimal post mode in client post job UI

- Type: Frontend
- Priority: P0
- Scope:
  - Add mode toggle on post job page: "Quick Post" vs "Full Post".
  - Quick Post only requires title, budget, and location.
  - Show completion prompt after success: "Add details to get better proposals".
- Files:
  - src/app/client/post-job/page.tsx
- Acceptance criteria:
  - Client can submit in <= 60s median from page open.
  - Validation blocks submission if any required quick fields are missing.
  - Success state includes explicit next-step CTA to complete details.
- Test cases:
  - Quick mode submit success with only 3 fields.
  - Quick mode submit blocked when title/budget/location invalid.
  - Full mode remains unchanged and works as before.

JG-102 - Extend job create API for minimal post payload

- Type: Backend API
- Priority: P0
- Scope:
  - Allow minimal post payload for a new draft-like state.
  - Keep full payload validation path for current behavior.
  - Return response flag indicating minimal post so frontend can show enrichment prompt.
- Files:
  - src/app/api/jobs/route.ts
  - src/lib/validations/schemas.ts
  - prisma/schema.prisma (if status enum needs minimal/draft state)
- Acceptance criteria:
  - API accepts minimal payload for quick mode without requiring full description/category.
  - Existing full post requests remain backward-compatible.
  - Role and auth checks remain intact.
- Test cases:
  - POST quick payload returns 200/201 and creates job record.
  - POST full payload behavior unchanged.
  - Unauthorized/non-client still rejected.

JG-103 - Enrichment prompt and completion action

- Type: Frontend
- Priority: P1
- Scope:
  - After quick post success, route user to edit flow with clear progress messaging.
  - Provide one-click "Complete details now" action.
- Files:
  - src/app/client/post-job/page.tsx
  - src/app/client/dashboard/page.tsx (optional reminder card)
- Acceptance criteria:
  - User sees immediate confirmation and enrichment CTA.
  - Edit route pre-fills quick post values.
- Test cases:
  - CTA navigates to edit mode and prefilled fields are present.
  - Returning users can complete remaining fields and publish updates.

### EPIC B: Quick Apply + Templates v1

JG-104 - Add template state and quick-fill controls in provider job apply modal

- Type: Frontend
- Priority: P0
- Scope:
  - Add template selector in provider dashboard job apply flow.
  - Initial templates: budget, premium, fast delivery.
  - Add "Apply with profile defaults" one-click action.
- Files:
  - src/app/dashboard/jobs/page.tsx
  - src/app/jobs/[id]/page.tsx
- Acceptance criteria:
  - Provider can apply with <= 2 interactions after opening apply modal.
  - Template sets cover letter + price + ETA defaults, still editable.
  - Existing manual apply flow remains available.
- Test cases:
  - Each template pre-fills expected fields.
  - One-click profile apply works when profile data exists.
  - Manual edits override template values before submission.

JG-105 - Persist provider proposal templates

- Type: Backend + Frontend
- Priority: P1
- Scope:
  - Add storage for per-provider reusable templates.
  - Add API to list/create/update/delete templates.
- Files:
  - src/app/api (new route namespace for proposal templates)
  - src/lib/api/hooks/useJobs.ts (new hooks)
  - prisma/schema.prisma (new model if DB persistence is chosen)
- Acceptance criteria:
  - Provider can save at least 3 templates.
  - Templates are available across sessions/devices.
  - Template CRUD enforces provider ownership.
- Test cases:
  - Provider can create, update, delete own templates.
  - Provider cannot access another provider templates.
  - Template list loads in apply flows.

JG-106 - Keep proposal submission validation aligned across entry points

- Type: Backend integrity
- Priority: P0
- Scope:
  - Ensure both apply entry points continue to use shared submit flow.
  - Ensure template/quick apply payloads still pass common business rules.
- Files:
  - src/lib/proposals/submitProposal.ts
  - src/app/api/proposals/route.ts
  - src/app/api/jobs/[id]/proposals/route.ts
- Acceptance criteria:
  - Both proposal endpoints accept template-generated payloads.
  - No behavior drift between dashboard and public job detail apply paths.
- Test cases:
  - Submit same payload through both endpoints yields equivalent persisted data.
  - Max applicants and duplicate proposal checks still enforced.

### EPIC C: Feedback Loops + Instrumentation

JG-107 - Standardize success feedback copy for post/apply actions

- Type: Frontend UX
- Priority: P0
- Scope:
  - Replace generic success toasts with action-oriented messages.
  - Add next-step hints after submit actions.
- Files:
  - src/app/client/post-job/page.tsx
  - src/app/dashboard/jobs/page.tsx
  - src/app/jobs/[id]/page.tsx
  - src/app/client/proposals/page.tsx
- Acceptance criteria:
  - Every major action has clear success feedback plus expected next event.
  - Error feedback remains specific and non-ambiguous.
- Test cases:
  - Success messages shown after job post, apply submit, accept/reject flows.
  - Error messages still surface backend validation issues.

JG-108 - Add jobs funnel event tracking hook and API endpoint

- Type: Analytics
- Priority: P0
- Scope:
  - Implement lightweight hook similar to existing landing event tracker.
  - Add API endpoint for jobs funnel events with schema validation.
  - Emit minimum events from section 3 of this document.
- Files:
  - src/hooks/useLandingEvents.ts (reference)
  - src/hooks (new jobs event hook)
  - src/app/api/analytics (new jobs events route)
  - src/app/client/post-job/page.tsx
  - src/app/dashboard/jobs/page.tsx
  - src/app/jobs/[id]/page.tsx
- Acceptance criteria:
  - Events are sent non-blocking and include required properties.
  - Event endpoint rejects malformed payloads.
  - Variant field supported for A/B analysis.
- Test cases:
  - Event emitted at key funnel transitions.
  - Invalid event payload returns 400.
  - Tracking failures do not break UX flows.

JG-109 - Add feature flags for Quick Post and Quick Apply templates

- Type: Delivery safety
- Priority: P0
- Scope:
  - Gate both features with configurable flags.
  - Add simple variant assignment support for experiment segmentation.
- Files:
  - src/hooks/useLandingCopyVariant.ts (reference for variant approach)
  - src/app/client/post-job/page.tsx
  - src/app/dashboard/jobs/page.tsx
  - src/app/jobs/[id]/page.tsx
- Acceptance criteria:
  - Flags can disable features without redeploying core behavior.
  - Variant is included in events for analysis.
- Test cases:
  - Flag OFF preserves current baseline flow.
  - Flag ON exposes feature to selected cohort only.

JG-110 - Build Week 1 dashboard and go/no-go checklist

- Type: Analytics operations
- Priority: P1
- Scope:
  - Create dashboard for quick-post and quick-apply funnels.
  - Include guardrail metrics and weekly release decision template.
- Files:
  - docs/features/testing-guide.md (or equivalent ops doc)
  - fix_todos/jobs_suggestion2.md (this file, KPI source)
- Acceptance criteria:
  - Dashboard shows conversion by step, role, and experiment variant.
  - Friday release checklist includes KPI + guardrail review.
- Test cases:
  - Dashboard query returns current-week data.
  - Team can compute go/no-go decision from defined thresholds.

## 11) Sprint Planning Notes

Dependencies:

1. JG-102 before JG-101 completion path (API support for quick mode).
2. JG-109 before broad release of JG-101 and JG-104.
3. JG-108 before KPI readout for experiments.

Recommended sequencing for 10 working days:

1. Days 1-2: JG-102, JG-108 skeleton, JG-109 scaffolding.
2. Days 3-4: JG-101, JG-103.
3. Days 5-6: JG-104.
4. Days 7-8: JG-105, JG-106.
5. Days 9-10: JG-107, JG-110, QA + staged rollout.

Release gate for end of Week 2:

- Primary KPI improvement observed in at least one of:
  - job_post_minimal_submitted / job_post_started
  - provider_apply_submitted / provider_apply_started
- No guardrail breach across dispute/cancellation/support thresholds.

## 12) Execution Lock: Finish Growth Foundation Before Role Migration

Decision:

- Freeze scope to growth sprint foundation work already in motion.
- Do not introduce hard role model switching during Weeks 1-2.

Why this order is required:

- Growth foundation is low-risk, reversible, and tied directly to near-term conversion gains.
- Role migration has high blast radius (auth, onboarding, API authorization, UI guards) and must be introduced incrementally.

Locked Week 1-2 scope (must ship before role migration rollout):

- Quick Post flow end-to-end.
- Quick Apply templates v1.
- Funnel events + experiment flags + dashboard readout.

Exit gate to unlock role migration work:

- No auth/role regressions in production paths.
- Quick Post KPI instrumentation reporting in dashboard.
- Quick Apply KPI instrumentation reporting in dashboard.
- Feature flags confirmed to disable new growth features without core regression.

## 13) Multi-Role Migration Strategy (Compatibility Layer, No Hard Switch)

Principle:

- Run multi-role support in parallel with current single-role behavior until parity is proven.

Safe pattern:

- Add roles array support while retaining existing role field.
- Introduce one shared permission helper and migrate checks incrementally.
- Keep legacy behavior as fallback until all critical paths are moved and verified.

Non-goals during initial migration:

- No immediate removal of single-role field.
- No full auth rewrite.
- No all-at-once endpoint conversion.

## 14) Multi-Role Migration Phases (Safest Order)

### Phase A: Data Model + Helper Layer

Scope:

- Add roles field and persistence support.
- Add hasRole helper and shared permission utility.
- Migrate highest-risk endpoints first (auth-protected write actions).

Definition of done:

- Roles array can be read/written without breaking existing role behavior.
- Shared helper is used by at least critical write endpoints.

### Phase B: Auth and Session Propagation

Scope:

- Ensure token/session carries roles array.
- Keep legacy role populated for backward compatibility.

Definition of done:

- Session and token payload include roles consistently.
- Legacy consumers continue to work without code changes.

### Phase C: Backfill and Defaults

Scope:

- Backfill existing providers to include both CLIENT and PROVIDER.
- Keep clients as CLIENT unless onboarding upgrades them.

Definition of done:

- Backfill is idempotent and reversible.
- New user default role behavior remains stable.

### Phase D: Onboarding and UX

Scope:

- On provider onboarding completion, add PROVIDER role (do not replace CLIENT).
- Update UI nav and guard logic to role-array checks.

Definition of done:

- Onboarding upgrades do not remove existing role access.
- UI gating behavior matches permission helper logic.

### Phase E: Hardening and Cleanup

Scope:

- Audit all role checks across API, auth middleware, and UI guards.
- Remove single-role assumptions only after parity tests pass.

Definition of done:

- No remaining critical-path single-role assumptions.
- Parity and regression suite passes before cutover.

## 15) Rollout and Risk Controls

Rollout pattern:

- Ship multi-role support behind a feature flag.
- Roll out by cohorts: internal -> 5% -> 25% -> 100%.

Rollback triggers (automatic hold or rollback if any spike detected):

- 401/403 response spikes.
- Failed job post/apply action spikes.
- Onboarding completion failure spikes.

Operational requirements:

- Migration must be idempotent and reversible until full cutover.
- Every cohort increment requires KPI + guardrail review and explicit go/no-go decision.

## 16) Five-Week Delivery Timeline (Recommended)

- Week 1-2: Complete growth sprint deliverables from this document (Quick Post, Quick Apply templates, instrumentation, flags, dashboard).
- Week 3: Execute Multi-Role Phase A-B.
- Week 4: Execute Multi-Role Phase C-D.
- Week 5: Execute Phase E cleanup, parity verification, and full rollout decision.

Completion criteria for this combined plan:

- Growth gains are measured and stable before role changes scale.
- Multi-role compatibility is proven before legacy fallback removal.
- Platform-wide auth regressions are prevented through staged rollout and rollback controls.

## 17) Multi-Role Implementation Map (Codebase Anchors)

Use this map to execute Phase A-E in the existing codebase with smallest possible change sets.

Current highest-risk touchpoints identified:

- Data model: `prisma/schema.prisma` (single `role` field and `UserRole` enum usage).
- Auth token/session propagation: `src/auth.ts`.
- Signup and credential verification payloads: `src/app/api/auth/signup/route.ts`, `src/app/api/auth/verify-credentials/route.ts`.
- Onboarding role writes: `src/app/api/users/onboarding/route.ts`.
- API authorization guards:
  - `src/app/api/proposals/route.ts`
  - `src/app/api/client/jobs/route.ts`
  - `src/app/api/admin/users/[id]/waive-fee/route.ts`
  - `src/app/actions/admin.ts`
- UI role-based navigation/guards:
  - `src/app/auth/login/page.tsx`
  - `src/app/onboarding/components/StepRoleSelect.tsx`
  - `src/app/onboarding/components/OnboardingShell.tsx`

Phase A implementation tickets:

- MR-201: Add `roles` compatibility field while keeping `role` as source of truth fallback.
- MR-202: Introduce shared permission helper (`hasRole`, `hasAnyRole`) and wire into highest-risk API endpoints first.
- MR-203: Add centralized role normalization utility (`normalizeRoles`) for session/user payloads.

Phase B implementation tickets:

- MR-204: Ensure JWT/session payload includes `roles` array.
- MR-205: Maintain legacy `role` value in payload for backward compatibility.

Phase C implementation tickets:

- MR-206: Idempotent backfill migration for existing provider users to include both CLIENT and PROVIDER roles.
- MR-207: Preserve CLIENT-only default for new users unless onboarding upgrades role set.

Phase D implementation tickets:

- MR-208: On onboarding completion, append PROVIDER role rather than replacing CLIENT role.
- MR-209: Migrate UI nav and guards from single-role checks to role-array helper checks.

Phase E implementation tickets:

- MR-210: Audit role checks across API/actions/UI and remove single-role assumptions after parity tests pass.
- MR-211: Add final cutover checklist and remove fallback only after 100% cohort stability window.

## 18) Feature Flag and Rollout Contract (Role Migration)

Required role migration flags:

- `ff_multi_role_read_enabled`: read and evaluate `roles` array.
- `ff_multi_role_write_enabled`: write/propagate `roles` in auth/onboarding paths.
- `ff_multi_role_enforce_enabled`: enforce role-array-based authorization checks.

Rollout contract:

- Enable flags progressively by cohort.
- Keep `ff_multi_role_enforce_enabled` off until Phase A-D parity checks pass.
- If rollback trigger fires, disable enforce first, then write, then read if required.

## 19) Validation Matrix (Must Pass Before Full Cutover)

Auth/session validations:

- User can sign in and receive both legacy `role` and compatibility `roles` values.
- Session refresh does not drop either field.

Authorization validations:

- Client-only flows remain accessible for CLIENT users.
- Provider-only flows remain accessible for PROVIDER users.
- Dual-role users can access both client and provider critical paths.
- Admin-only paths remain ADMIN-protected.

Growth guard validations:

- Quick Post and Quick Apply funnels continue to emit events after role compatibility code is enabled.
- Dashboard readout remains segmented by experiment variant and role context.

Rollback drill:

- Simulate flag rollback and confirm baseline auth/authorization behavior restores without data loss.
