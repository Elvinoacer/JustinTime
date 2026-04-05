# Gamification/Loyalty hardening status (2026-04-05)

This checklist validates the previously reported production risks against the current codebase.

## Overall verdict

Status: **Partially solved, not fully solved**.

- Core architectural risks (sync-on-read, side-effectful reads, broad API privacy leaks, and several redemption/idempotency weaknesses) are now addressed.
- A smaller set of gaps remain, mostly around event coverage, stricter typing/constraints, and full product/ops completeness.

## Resolved items (high confidence)

- Badge reads are now pure (`getUserBadges` uses `getBadgesForUser`; no read-path award/sync).
- Badge definition sync is admin-only (`syncBadges`) rather than user traffic.
- `early-adopter` no longer auto-awards (`JOINED_BEFORE_DATE`).
- Requirement evaluator now supports `REVENUE_MILESTONE` and `JOINED_BEFORE_DATE`.
- API/action badge payloads are unified via `badge-service`.
- `/api/badges` now restricts cross-user access to admins/self.
- Badge awarding is idempotent for notification emission (notify only on first create).
- Loyalty accrual uses serializable transactions + advisory locks + idempotency keys.
- Reward redemption is transactional, lock-protected, supports points cost and policy knobs.
- Reward code collisions are retried.
- Redemption status is now enum-backed in Prisma.
- Partner/admin authorization exists for redemption validation/consumption routes.
- Loyalty dashboard route exists with rewards/history/leaderboard sections.

## Remaining gaps / not fully solved

1. **Badge award flow is still not fully event-complete**
   - `checkAndAwardBadges` is triggered on booking completion and reviews, but not clearly on every modeled event family (e.g. profile update, revenue settlement, account creation).

2. **`UserBadge.progress` remains in schema despite live progress source-of-truth**
   - Runtime uses computed `progressCurrent/progressRequired`, but legacy `UserBadge.progress` still exists and can cause semantic drift for future contributors.

3. **Reward and transaction statuses are still string fields in some models**
   - `LoyaltyPointTransaction.status` and `PartnerReward.status` remain plain strings (badge/redeem status enums are improved).

4. **No explicit reversal pipeline yet**
   - Schema has reversal-oriented fields, but no complete reversal workflows/service API were found for safely reversing prior point awards end-to-end.

5. **Leaderboard UX/policy depth is improved but still basic in dashboard wiring**
   - Core function supports period filters and privacy/provider filtering, but dashboard action currently calls all-time/provider-only and does not expose period/segment controls in UI.

## Conclusion

The feature has moved from "half-implemented" to **substantially hardened**, but it is **not yet fully solved to completion**. The highest-risk correctness/security issues are largely fixed; remaining work is mostly completeness and policy/operational hardening.
