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
- Score: (Impact * Confidence) / Effort.

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

