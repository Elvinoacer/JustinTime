# JustInTime — M-Pesa STK Push: All Breakpoints & Fixes

> **Root problem in one sentence:** When `DARAJA_RECONCILE_CRON_SECRET` is set, every real-time Daraja callback is silently queued instead of processed. The frontend poll tries to recover via a synthetic webhook, but that synthetic webhook goes through a redundant second API verification that can fail on timing. The poll times out at 90 s, but the cron only processes payments that are 5+ minutes old, creating a dead zone of up to 10 minutes where the wallet is never credited and the user sees PENDING forever.

---

## BUG 1 — All real Daraja callbacks are queued, never processed immediately

**File:** `src/app/api/wallet/webhook/route.ts`  
**Lines:** 390–392, 505–512

### What's broken

```ts
// This condition is TRUE whenever the cron secret is configured
const queueEnabled = String(process.env.DARAJA_RECONCILE_CRON_SECRET || "").trim().length > 0;
const queueOnly = queueEnabled && !internalProcessing;

// ...later in the transaction:
if (queueOnly) {
  return {
    received: true,
    queued: true,            // ← webhook receipt saved, but NOTHING IS PROCESSED
    reason: "webhook_queued_for_worker",
    ...
  };
}
```

When `DARAJA_RECONCILE_CRON_SECRET` is set (which it must be for the cron to work), **every single Daraja STK callback from M-Pesa gets queued and immediately exits without processing.** Safaricom fires this callback the instant the user pays, but your code drops it into a queue and walks away. No wallet credit. No status update. The cron eventually picks it up — but not before the frontend poll times out.

### Fix

**Option A (recommended) — Process terminal states immediately, queue non-terminal:**

The only reason to queue is to avoid race conditions on duplicate webhooks. Terminal states (SETTLED, CANCELLED, FAILED) are safe to process immediately because they are idempotent. Only queue ambiguous/mid-flight states.

```ts
// src/app/api/wallet/webhook/route.ts

const queueEnabled =
  String(process.env.DARAJA_RECONCILE_CRON_SECRET || "").trim().length > 0;

// Parse the webhook early enough to check the state before deciding to queue
const webhook = parseDarajaWebhook(body);
const gatewayState = webhook.state;

// Terminal states must be processed immediately for real-time UX.
// Only queue non-terminal events (PENDING, PROCESSING) where dedup matters.
const isTerminalState = ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(
  gatewayState,
);
const queueOnly = queueEnabled && !internalProcessing && !isTerminalState;
```

**Option B — Process immediately for all, keep the queue as an audit trail only:**

Remove the early `return` on `queueOnly`. Keep `recordPaymentWebhookReceipt` for dedup/audit, but always continue to the full processing path.

```ts
// Replace the early-exit block:

// BEFORE (broken):
if (queueOnly) {
  return {
    received: true,
    queued: true,
    reason: "webhook_queued_for_worker",
    ...
  };
}

// AFTER (fixed): Save receipt for audit/dedup, but always process:
// (The recordPaymentWebhookReceipt call already deduplicates via dedupeKey,
//  so processing twice is safe — the second run will be a no-op.)
// Simply remove the early-return block entirely. The receipt is already
// recorded above; just let execution fall through to the processing logic.
```

---

## BUG 2 — Status poll's `verifyDarajaPayment` errors are completely swallowed

**File:** `src/app/api/wallet/topup/status/route.ts`  
**Location:** The `catch` block inside `GET()`

### What's broken

```ts
try {
  const providerSnapshot = await verifyDarajaPayment({ ... });
  // ...fires synthetic webhook if SETTLED...
} catch (error) {
  // ← SILENT. If Daraja's query API is unreachable, rate-limited, or
  //   throws any error, this catch eats it. Status stays PENDING.
  //   Frontend polls 22 more times, times out, user is lost.
  console.warn(
    "[WALLET_TOPUP_STATUS_GET] Redirect reconciliation attempt failed",
    error,
  );
}
```

If `verifyDarajaPayment` fails for any reason (network timeout, Safaricom 500, invalid credentials), the status route silently returns the current DB status (PENDING) without telling the frontend anything went wrong. Every subsequent poll call will also hit this error and silently fail. The user never sees the payment confirm.

### Fix

```ts
// src/app/api/wallet/topup/status/route.ts

let reconciliationError: string | null = null;

if (!isTerminalTopUpStatus(topUp.status) && verificationCheckoutRequestId) {
  try {
    const providerSnapshot = await verifyDarajaPayment({ ... });
    const canonicalProviderState = providerSnapshot.providerState;
    const shouldForwardSettled = canonicalProviderState === "SETTLED";
    const shouldForwardTerminal = ["FAILED", "CANCELLED", "REVERSED"].includes(
      canonicalProviderState,
    );

    if (shouldForwardSettled || shouldForwardTerminal) {
      await handleWalletWebhook(buildSyntheticWebhookRequest(req.url, syntheticPayload));
      const refreshedTopUp = await loadTopUp();
      if (refreshedTopUp) topUp = refreshedTopUp;
    }
  } catch (error) {
    // Surface the error so the frontend can show a "retry" hint instead of
    // silently showing PENDING.
    reconciliationError =
      error instanceof Error ? error.message : "Verification request failed";
    console.error("[WALLET_TOPUP_STATUS_GET] Reconciliation failed", error);
  }
}

// ...then include it in the response:
return NextResponse.json({
  topUpId: topUp.id,
  // ...all existing fields...
  reconciliationError, // ← new field: null when OK, string when Daraja query failed
});
```

In the frontend `TopUpCompletionStatus.tsx`, consume this to show a meaningful error:

```tsx
// src/components/wallet/TopUpCompletionStatus.tsx

{
  statusQuery.data?.reconciliationError && !isTerminal && (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Could not reach M-Pesa to verify status (
      {statusQuery.data.reconciliationError}). Retrying automatically...
    </div>
  );
}
```

---

## BUG 3 — Double `verifyDarajaPayment` for SETTLED creates a redundant failure surface

**File:** `src/app/api/wallet/webhook/route.ts`  
**Lines:** ~736–800

### What's broken

The status poll already calls `verifyDarajaPayment` once and gets SETTLED. It then fires a synthetic internal webhook. Inside the webhook handler, for `SETTLED` state, it calls `verifyDarajaPayment` **a second time**:

```
Status poll:
  1. verifyDarajaPayment(checkoutId) → SETTLED ✓
  2. fire synthetic webhook (internal)
      └─ Webhook handler:
           3. parseDarajaWebhook → SETTLED
           4. verifyDarajaPayment(checkoutId) → AGAIN  ← second call
              └─ if stateMatches: false → skip settlement ← silent failure
```

If M-Pesa's STK query API returns a different result on the second call within milliseconds (edge case, but it happens), `stateMatches` is false and settlement is skipped. No error is thrown. The webhook returns `{ received: true, skipped: true, reason: "provider_status_verification_failed" }`. The wallet is never credited. The poll sees PENDING on the next cycle.

### Fix

For **trusted internal/synthetic webhooks** (those with `internalProcessing = true`), skip the second `verifyDarajaPayment` call. The verification already happened upstream (in the status route or the cron reconciler). Trust the `ResultCode: 0` in the payload.

```ts
// src/app/api/wallet/webhook/route.ts

// In the SETTLED branch, replace:
if (gatewayState === "SETTLED") {
  if (!gatewaySessionId) { /* ... */ }

  const verification = await verifyDarajaPayment({ ... });
  if (!verification.stateMatches) {
    // ← this causes silent skips for synthetic/internal webhooks
    return { received: true, skipped: true, reason: "provider_status_verification_failed" };
  }
  verifiedSettlementAmount = verification.amount ?? null;
}

// With:
if (gatewayState === "SETTLED") {
  if (!gatewaySessionId) { /* ... same as before ... */ }

  if (!internalProcessing) {
    // External webhook from Safaricom: verify against the query API
    const verification = await verifyDarajaPayment({ ... });
    if (!verification.stateMatches) {
      // Still record but require manual resolution
      await updateWalletTopUpPaymentIntentFromWebhook(tx, {
        ...
        gatewayState: "PROCESSING",
        failureReason: "Provider status verification failed",
        ...
      });
      return {
        received: true,
        skipped: true,
        requiresManualResolution: true,
        reason: "provider_status_verification_failed",
        ...
      };
    }
    verifiedSettlementAmount = verification.amount ?? null;
  } else {
    // Internal/synthetic webhook: the caller already verified.
    // Trust the Amount field from the payload directly.
    verifiedSettlementAmount = amountFromGateway ?? Number(topUp.amountExpected);
  }
}
```

---

## BUG 4 — 90-second poll timeout vs. 5–10 minute cron processing window

**Files:**

- `src/components/wallet/TopUpCompletionStatus.tsx` (`POLL_TIMEOUT_MS = 90_000`)
- `src/app/api/internal/cron/reconcile-daraja-payments/route.ts` (`staleMinutes = 5`)
- `.github/workflows/daraja-webhook-receipts-cron.yml` (schedule: `*/5 * * * *`)

### What's broken

```
T+0s   User pays → Daraja callback fires → queued (not processed)
T+4s   Frontend poll #1: verifyDarajaPayment → M-Pesa API may still say PROCESSING
T+8s   Frontend poll #2: same
...
T+90s  POLL_TIMEOUT_MS reached → "could not confirm in time" → polling stops
T+300s (5 min) Cron runs → finds no payments old enough (need 5+ min old)
T+600s (10 min) Cron runs → payment is now 5+ min old → processes → wallet credited
```

The user gives up at 90 seconds. The wallet is silently credited at 10 minutes with no notification.

### Fix — Three-part fix

**Part A: Reduce poll timeout mismatch by extending it OR resuming after timeout:**

```ts
// src/components/wallet/TopUpCompletionStatus.tsx

// Option 1: Increase timeout to bridge the cron gap (blunt but simple)
const POLL_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes — covers worst-case cron delay

// Option 2 (better UX): Keep the 90s "fast" timeout, then switch to a
// slower "background" poll instead of stopping entirely:
const FAST_POLL_INTERVAL_MS = 4_000;   // 4s for first 90s
const SLOW_POLL_INTERVAL_MS = 30_000;  // 30s after timeout

refetchInterval: (query) => {
  const status = query.state.data?.status;
  const isTerminal = ["SETTLED", "FAILED", "CANCELLED", "REVERSED"].includes(status);
  if (isTerminal) return false;

  // After "soft timeout" switch from fast to slow polling instead of stopping
  if (timedOut) return SLOW_POLL_INTERVAL_MS;

  return FAST_POLL_INTERVAL_MS;
},
```

**Part B: Reduce cron `staleMinutes` to 1 minute:**

```ts
// src/app/api/internal/cron/reconcile-daraja-payments/route.ts

// Change the default stale threshold from 5 minutes to 1 minute.
// A 1-minute-old payment is definitely stale enough to warrant a query check.
const requestedMinutes = Number(url.searchParams.get("staleMinutes") || "1"); // was "5"
const staleMinutes =
  Number.isFinite(requestedMinutes) && requestedMinutes >= 1
    ? Math.min(requestedMinutes, 240)
    : 1;
```

**Part C: Increase cron frequency:**

```yaml
# .github/workflows/daraja-webhook-receipts-cron.yml

# Change from every 5 minutes to every 2 minutes:
on:
  schedule:
    - cron: "*/2 * * * *" # was "*/5 * * * *"
```

With these three changes combined: cron runs every 2 minutes and picks up payments that are 1+ minute old, closing the gap from ~10 minutes to ~3 minutes maximum.

---

## BUG 5 — Polling stops entirely after timeout; no resume when payment eventually confirms

**File:** `src/components/wallet/TopUpCompletionStatus.tsx`

### What's broken

```ts
refetchInterval: (query) => {
  if (timedOut || isTerminal) {
    return false; // ← dead. polling stops. wallet could credit at minute 10 silently.
  }
  return POLL_INTERVAL_MS;
},
```

Once `timedOut = true`, the query stops refetching. If the cron credits the wallet 10 minutes later, the user has no idea. They're looking at a PENDING card with no updates and no way to know the payment went through.

### Fix

Replace the hard stop with a slow background poll + auto-invalidate wallet on terminal state detection:

```tsx
// src/components/wallet/TopUpCompletionStatus.tsx

const FAST_POLL_INTERVAL_MS = 4_000;
const SLOW_POLL_INTERVAL_MS = 30_000; // keep checking in background after timeout

// In useWalletTopUpStatus options:
refetchInterval: (query) => {
  const status = query.state.data?.status;
  const isTerminal =
    status === "SETTLED" ||
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "REVERSED";

  if (isTerminal) return false;                  // confirmed: stop
  if (timedOut) return SLOW_POLL_INTERVAL_MS;    // timed out: slow poll
  return FAST_POLL_INTERVAL_MS;                  // normal: fast poll
},

// Also update the timedOut message to set expectations:
{timedOut && !isTerminal && (
  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
    We could not confirm this payment within the expected window.
    <strong> We are still monitoring it in the background.</strong>
    Your wallet will update automatically once M-Pesa confirms.
  </div>
)}
```

And ensure wallet queries are invalidated when the slow-poll eventually catches a SETTLED state — the existing `useEffect` on `isTerminal` already does this, so it will fire whenever the slow poll finally gets a SETTLED response.

---

## BUG 6 — No wallet query invalidation after cron-based late settlement

**File:** `src/components/wallet/TopUpCompletionStatus.tsx`

### What's broken

The `useEffect` that invalidates wallet queries only fires when the user is still on the `topup-complete` page and `isTerminal` changes. If the user navigated away (because the poll timed out and they gave up), and the cron settles the wallet 10 minutes later, the wallet page they return to still shows the old balance from cache.

### Fix

In `src/app/client/wallet/page.tsx` and `src/app/dashboard/wallet/page.tsx`, add aggressive cache invalidation on mount for any user with pending topups:

```tsx
// In both wallet page components, add:
const { data: wallet } = useWallet();
const queryClient = useQueryClient();

useEffect(() => {
  // If there are pending top-ups, re-check on every wallet page visit
  if (
    wallet?.topUpStats?.pendingCount > 0 ||
    wallet?.topUpStats?.processingCount > 0
  ) {
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.wallet.transactions(),
    });
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Also set a shorter `staleTime` on wallet queries when there are pending topups:

```ts
// src/lib/api/hooks/useWallet.ts — in useWallet():
const { data: existingWallet } =
  useQueryClient().getQueryData<WalletSummary>(queryKeys.wallet.all) ?? {};

const hasPendingTopUps =
  (existingWallet?.topUpStats?.pendingCount ?? 0) > 0 ||
  (existingWallet?.topUpStats?.processingCount ?? 0) > 0;

return useQuery<WalletSummary, Error>({
  queryKey: queryKeys.wallet.all,
  queryFn: async () => {
    /* ... */
  },
  staleTime: hasPendingTopUps ? 10_000 : 60_000, // 10s if pending, 60s otherwise
  ...options,
});
```

---

## BUG 7 — GitHub Actions cron reliability needs hardening

**File:** `.github/workflows/daraja-webhook-receipts-cron.yml`

### What's broken

The entire queued-receipt processing pipeline depends on GitHub Actions running on schedule. If:

- GitHub has an outage
- The job times out
- The `DARAJA_WEBHOOK_RECEIPTS_PROCESS_URL` or `DARAJA_RECONCILE_CRON_SECRET` secrets are wrong
- The repo gets rate-limited by GitHub

...then queued receipts are never processed. Users' payments are stuck in PENDING indefinitely.

### Fix — Keep cron in GitHub and harden execution

If all cron must remain in GitHub, harden the workflows and monitoring instead of adding another scheduler.

1. Keep both workflows enabled and scheduled:
   - `.github/workflows/daraja-webhook-receipts-cron.yml` (every 5 minutes)
   - `.github/workflows/daraja-stale-reconciliation-cron.yml` (every 5 minutes)
2. Keep required repository secrets configured and validated:
   - `DARAJA_WEBHOOK_RECEIPTS_PROCESS_URL`
   - `DARAJA_RECONCILE_PAYMENTS_URL`
   - `DARAJA_RECONCILE_CRON_SECRET`
3. Keep route auth strict to `DARAJA_RECONCILE_CRON_SECRET` only:

```ts
function hasSecretAccess(request: Request): boolean {
  const expectedSecret = String(
    process.env.DARAJA_RECONCILE_CRON_SECRET || "",
  ).trim();
  if (!expectedSecret) return false;

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) return true;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}
```

4. Add alerting/visibility for failed workflow runs so missed cron windows are noticed quickly.

---

## BUG 8 — The `localStorage` pending topup reference is never cleaned up on error paths

**File:** `src/lib/api/hooks/useWallet.ts` — `useTopUpWallet` mutation

### What's broken

```ts
onSuccess: (data) => {
  if (typeof window !== "undefined" && (data.apiRef || data.topUpId)) {
    window.localStorage.setItem(TOPUP_STORAGE_KEY, JSON.stringify(payload));
  }
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl; // ← navigate away
  }
};
```

The `localStorage` key is set and the user is redirected. `clearStoredPendingTopUp` is called inside `TopUpCompletionStatus` only when `isTerminal` is true. If:

- The user closes the browser tab after paying
- The STK push expires (no user action, M-Pesa timeout)
- The user navigates directly away from the completion page

...then the `localStorage` key is never cleared. On the next visit to any wallet completion page, `getStoredPendingTopUp()` returns the stale reference and the component immediately starts polling for an old, expired topup.

### Fix

Add a TTL check when reading the stored pending topup:

```ts
// src/lib/api/hooks/useWallet.ts

const TOPUP_STORAGE_TTL_MS = 15 * 60 * 1000; // 15 minutes — M-Pesa STK expires in 5 min

export function getStoredPendingTopUp(): {
  apiRef?: string;
  topUpId?: string;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TOPUP_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Expire stale references automatically
    const initiatedAt = parsed.initiatedAt
      ? new Date(parsed.initiatedAt).getTime()
      : 0;
    if (initiatedAt && Date.now() - initiatedAt > TOPUP_STORAGE_TTL_MS) {
      window.localStorage.removeItem(TOPUP_STORAGE_KEY); // auto-clean
      return null;
    }

    const apiRef =
      typeof parsed.apiRef === "string" ? parsed.apiRef : undefined;
    const topUpId =
      typeof parsed.topUpId === "string" ? parsed.topUpId : undefined;
    if (!apiRef && !topUpId) return null;

    return { apiRef, topUpId };
  } catch {
    return null;
  }
}
```

Also call `clearStoredPendingTopUp()` in `onError` of the mutation so failed initiations don't leave orphan keys:

```ts
onError: (error) => {
  clearStoredPendingTopUp(); // ← add this
  const message = error?.message || "Failed to initiate top-up";
  toast.error(message);
},
```

---

## Quick-Reference: Fix Priority Order

| #   | Bug                                                  | Severity    | Effort | Fix Summary                                                                      |
| --- | ---------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------- |
| 1   | `queueOnly` blocks all real-time confirmations       | 🔴 Critical | Medium | Process terminal states immediately; skip the queue for SETTLED/CANCELLED/FAILED |
| 3   | Double `verifyDarajaPayment` for SETTLED             | 🔴 Critical | Small  | Skip second verification for `internalProcessing = true` webhooks                |
| 2   | `verifyDarajaPayment` errors silently swallowed      | 🔴 Critical | Small  | Re-throw / surface `reconciliationError` in status response                      |
| 5   | Polling stops on timeout; no background resume       | 🟠 High     | Small  | Switch to slow poll (30s) after timeout instead of stopping                      |
| 4   | 90s poll timeout vs 10min cron window                | 🟠 High     | Small  | Reduce cron staleMinutes to 1 and keep GitHub cron at 5-minute cadence           |
| 6   | Wallet cache stale after late cron settlement        | 🟡 Medium   | Small  | Invalidate wallet queries on wallet page mount if pending topups exist           |
| 7   | GitHub Actions cron reliability needs hardening      | 🟡 Medium   | Medium | Keep GitHub-only cron and harden secrets, monitoring, and workflow alerting      |
| 8   | Stale `localStorage` reference pollutes next session | 🟡 Medium   | Small  | Add 15-minute TTL to `getStoredPendingTopUp()`                                   |

---

## What the fixed flow looks like end-to-end

```
T+0s   User pays on M-Pesa prompt
T+2s   Safaricom fires STK callback → webhook/route.ts receives it
       → BUG 1 FIXED: SETTLED is terminal → processes immediately (no queue)
       → verifyDarajaPayment #1 → SETTLED ✓
       → wallet.balance += amount
       → walletTopUp.status = SETTLED

T+4s   Frontend poll #1 → /api/wallet/topup/status returns SETTLED
       → queryClient.invalidateQueries(wallet.all)
       → UI: ✅ "Confirmed. Redirecting to wallet..."
T+6s   Auto-redirect to /dashboard/wallet with updated balance
```

If the callback never arrives (network issue), the status poll's `verifyDarajaPayment` (BUG 2/3 fixed) fires a trusted synthetic webhook that processes immediately, so the UX recovers within the first 4-second poll cycle. If that also fails, the slow background poll (BUG 5 fixed) catches cron-based settlement during the next GitHub cron window and updates the UI without any user action.
