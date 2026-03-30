# Jobs Suggestion Audit Tracker

Last updated: 2026-03-30
Scope: Normalize earlier findings into current implementation status for the Jobs system.

## Summary

- Major foundational gaps from the original audit have been addressed in code.
- A few product-layer enhancements are still pending.
- This file is now the source of truth; old historical wording has been removed to avoid contradictions.

## Status Legend

- Fixed: Implemented and wired into active Jobs/Proposals/Bookings flows.
- Partially addressed: Core implementation exists, but one or more suggested enhancements are still missing.
- Pending: Not yet implemented in Jobs flow.

## Fixed

- Proposal flow unified across both endpoints.
  - Shared service: `src/lib/proposals/submitProposal.ts`
  - Used by: `src/app/api/proposals/route.ts`, `src/app/api/jobs/[id]/proposals/route.ts`

- Proposal notification to client/job owner implemented.
  - Notification path in shared submit service using existing system.

- Messaging from Jobs surfaces wired to existing chat.
  - Client job details supports provider message deep-link.
  - Public job details supports message-to-client deep-link.

- Trust indicators surfaced in job proposal cards.
  - Verified badge, rating/review count, skills, certifications count.

- Provider available jobs count made DB-accurate.
  - Filtering moved into query path for available-tab accuracy.

- Recommendation tab and reason chips implemented for provider dashboard.
  - Includes: category match, low competition, urgency, this-week, high-win-rate, reliable-history.

- Accepting a proposal now creates booking context.
  - Acceptance flow creates/ensures booking for downstream lifecycle actions.

- Cancellation reason and cancellation audit fields captured.
  - `cancellationReason`, `cancelledAt`, `cancelledBy` persisted on cancellation path.

- Dispute creation flow implemented.
  - `POST /api/bookings/[id]/dispute` creates dispute and marks booking disputed.
  - Client proposal UI includes Report Issue action for accepted proposals.

- Escrow-lite lifecycle implemented.
  - Hold on acceptance.
  - Release on completion.
  - Refund on cancellation path.

- Milestone escrow APIs implemented.
  - `GET /api/bookings/[id]/escrow/milestones`
  - `POST /api/bookings/[id]/escrow/milestones`
  - `PATCH /api/bookings/[id]/escrow/milestones`

- Admin dispute resolution now triggers operational outcomes.
  - Resolution can continue execution or cancel/refund according to outcome.

## Partially Addressed

- Hiring decision assistance UX.
  - Implemented: proposal scoring, sorting, compare mode in client proposals workspace.
  - Remaining from original suggestion: explicit labels/predictors such as “Best Value”, delivery reliability prediction, and dedicated risk framing.

- Trust layer depth.
  - Implemented: verified/rating/reviews/skills/certifications and profile snapshot.
  - Remaining from original suggestion: response-rate metric and completed-jobs count surfaced directly in Jobs proposal cards.

- Real-time expectations for Jobs.
  - Implemented: real-time chat exists in message workspaces.
  - Remaining: dedicated real-time job/proposal update channel (outside chat) if required as a product goal.

## Pending

- Quick Post mode (lightweight post flow before full details).
- Quick Apply and reusable proposal templates.
- Smart pricing guidance in proposal flow.
- AI proposal assistant features (write/summarize/suggest pricing).
- Reputation economy mechanics in Jobs experience (levels/badges/streak surfacing).
- Team-marketplace auto-routing integration in core Jobs/Proposals/Bookings APIs.
- Job quality scoring badges and client guidance module in Jobs hiring flow.

## Constraint Check

- Reuse existing systems: satisfied.
  - Messaging and notifications were extended instead of replaced.
  - Escrow and disputes were built on existing booking/payment/dispute models.

## Next Implementation Priority (if continuing)

1. Quick Post + Quick Apply/templates.
2. Smart pricing guidance + optional AI assist.
3. Team-marketplace integration and job-quality guidance.
