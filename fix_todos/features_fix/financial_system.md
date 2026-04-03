Based on the provided codebase files, here is a detailed analysis of the broken data flows and UI flows for the Financial Systems (Feature 10), followed by a comprehensive plan to fix them.

### Part 1: Analysis of Broken Data and UI Flows

#### 10.1 Wallet

- **UI Hard-Block (Client Wallet)**: In `src/app/client/wallet/page.tsx`, the entire UI is blocked by a hardcoded "Coming Soon" overlay (`<div className="absolute inset-0 z-50 bg-white/60...`). The actual content has `opacity-50 pointer-events-none`, rendering the client wallet completely inaccessible.
- **Redirect Routing Mismatch**: In `src/app/api/wallet/topup/route.ts`, the `redirectUrl` is hardcoded to `/dashboard/wallet/topup-complete` (the Provider dashboard). If a Client tops up their wallet, they will be redirected to a Provider route, causing a 404 or unauthorized error.
- **Deprecated Verification Endpoint**: The `ClientWalletPageContent` looks for `payment_status=success` in the URL params and fires `verifyMutation.mutate({ apiRef })`. However, `src/app/api/wallet/verify/route.ts` explicitly returns a `410 Gone` error stating: _"This endpoint is disabled. Wallet credits are applied only by verified payment webhooks."_ This results in a guaranteed frontend error toast on successful top-ups.

#### 10.2 Provider Earnings

- **Gross vs. Net Mismatch (Critical)**: In `src/app/api/provider/earnings/route.ts`, the total earnings are calculated by summing up `booking.service?.price || booking.job?.budget`. This completely ignores the `TRUST_FEE_RATE` and `EXCISE_DUTY_RATE` defined in `src/lib/financials.ts`. Providers are shown their Gross earnings, but their actual payout will be Net, leading to severe financial disputes and distrust.
- **Empty Payouts Data**: In the same earnings API, the payouts list is hardcoded to an empty array (`const payouts: any[] = [];`). Consequently, the `EarningsPage` UI (`src/app/dashboard/earnings/page.tsx`) will always show "No payouts yet", even if the provider has received money.
- **State Mutation in GET Request**: The earnings chart API (`src/app/api/provider/earnings/chart/route.ts`) initializes missing days with 0, which is fine, but it assumes `payment.amount` maps 1:1 with earnings without tracking refunds or adjustments.

#### 10.3 Onboarding Fee

- **Conflicting Payment Flows**: There are two distinct ways to pay the onboarding fee. `src/app/actions/revenue.ts` (`payOnboardingFee`) deducts the fee directly from the `Wallet` balance. Meanwhile, `src/app/api/onboarding-fee/initiate/route.ts` creates a direct IntaSend checkout. The UI lacks a unified source of truth for handling this.
- **Trust & Safety Bypass Risk**: In `src/app/api/onboarding-fee/webhook/route.ts`, successfully processing the payment automatically updates the profile to `verificationStatus: "VERIFIED"`. This instantly grants verified badges and privileges, entirely bypassing the actual background check/document verification flow.

#### 10.4 Subscriptions & Plans

- **Missing Financial Records**: In `src/app/api/subscription/webhook/route.ts`, a successful payment updates the `Subscription` table, but it **fails to create a `Transaction` record**. Users will be charged for PRO/BUSINESS plans, but these payments will not appear in their Wallet Transaction History.
- **Anti-Pattern (State Mutation on GET)**: In `src/app/api/subscription/status/route.ts`, checking the status (a GET request) actually executes the downgrade logic (`isActive: false`, `plan: "FREE"`) if the date has expired. This means the subscription only expires if the user actively visits a page that calls this endpoint. It should be handled by a cron job.
- **Checkout URL Hardcoding**: In `src/app/api/subscription/initiate/route.ts`, `redirect_url` is hardcoded to `/dashboard/profile`. It should redirect back to `/dashboard/premium` where the user initiated the flow to show a success state.

#### 10.5 & 10.6 Promo Codes and Revenue Actions

- **Missing Promo Discount Application**: While promo codes can be created via `actions/promo.ts` and evaluated by `lib/financials.ts`, `purchaseCredits` and `promoteService` in `src/app/actions/revenue.ts` deduct the strict, hardcoded prices (e.g., `pack.price`, `planDetails.price`). Users cannot apply their promo codes to internal ecosystem purchases.

---

### Part 2: Comprehensive Fix Plan

#### Step 1: Repair the Wallet Flow (Client & API)

1.  **Remove the Blocker**: Remove the "Coming Soon" overlay and pointer-event restrictions from `src/app/client/wallet/page.tsx`.
2.  **Dynamic Redirects**: Update `src/app/api/wallet/topup/route.ts` to accept a `returnUrl` parameter in the payload. Route clients to `/client/wallet/topup-complete` and providers to `/dashboard/wallet/topup-complete`.
3.  **Remove Client-Side Verification**: Strip the `useVerifyTopUp` call out of `src/app/client/wallet/page.tsx`. Instead, rely on a polling mechanism or simply query `useWallet()` to check if the balance has updated, since the IntaSend Webhook is the actual source of truth.

#### Step 2: Accurate Earnings & Payouts Tracking

1.  **Integrate Financials Library**: Refactor `src/app/api/provider/earnings/route.ts` to use `calculateBookingBreakdown` from `src/lib/financials.ts`. Sum up the `netAmount` rather than the raw `price/budget` so providers see exactly what they will receive after platform and tax deductions.
2.  **Fetch Actual Payouts**: Replace `const payouts: any[] = [];` with a Prisma query fetching `Transaction` records where `type === 'WITHDRAWAL'` or `type === 'PAYOUT'` associated with the user's wallet. Map this data to the format required by the UI.

#### Step 3: Secure the Onboarding Fee Logic

1.  **Decouple Payment from Verification**: In `src/app/api/onboarding-fee/webhook/route.ts`, remove `verificationStatus: "VERIFIED"`. Change it so it merely updates `hasPaidOnboardingFee: true`. The actual `VERIFIED` status should only be granted by the Trust & Safety admin interface after document review.
2.  **Consolidate Payment UI**: Ensure the frontend explicitly allows users to choose to pay the onboarding fee _either_ via IntaSend directly _or_ by deducting from an existing Wallet balance (using the `revenue.ts` action).

#### Step 4: Fix Subscription Lifecycle & History

1.  **Record Subscription Transactions**: Update `src/app/api/subscription/webhook/route.ts` to wrap the subscription creation in a `$transaction`. Alongside updating the `Subscription` table, create a `Transaction` record so users get receipts for their PRO/BUSINESS plan purchases in their history.
2.  **Move Expiration Logic to Cron**: Remove the downgrade logic from the GET request in `src/app/api/subscription/status/route.ts`. Create a dedicated endpoint (e.g., `/api/internal/cron/expire-subscriptions`) that runs daily to find expired subscriptions, downgrade them to "FREE", and dispatch the notification emails.
3.  **Fix Subscription Redirects**: Update `src/app/api/subscription/initiate/route.ts` to set `redirect_url` to `${process.env.NEXTAUTH_URL}/dashboard/premium?success=true`.

#### Step 5: Unify Financial Services

1.  **Enable Promos for Ecosystem Purchases**: Update `src/app/actions/revenue.ts` (`purchaseCredits` and `promoteService`) to accept an optional `promoCode` argument. Run `validatePromoCodeAction` and apply the `discountAmount` before deducting funds from the user's wallet.
2.  **Reconciliation Admin Fixes**: In `src/app/admin/reconciliation/page.tsx`, add UI action buttons next to mismatched items allowing an admin to trigger a "Force Settle", "Refund", or "Void" action, invoking an admin server action to manually patch the database states.

Here is a much deeper, code-level diagnostic of the Financial Systems (Feature 10). Beyond the surface-level UI blockers and routing mismatches, there are severe underlying architectural flaws, race conditions, and data integrity risks that will cause financial discrepancies and support nightmares if deployed as-is.

### Part 1: Deep Diagnostic of Broken Flows & Systemic Risks

#### 1. Concurrency & Race Conditions in Revenue Actions

**The Flaw:** In `src/app/actions/revenue.ts`, functions like `purchaseCredits`, `payOnboardingFee`, and `promoteService` read the user's wallet balance, perform math in memory, and write back the new balance.
**The Risk:** There are **no row-level locks** (e.g., `SELECT ... FOR UPDATE` or `pg_advisory_xact_lock`) used in these server actions. If a user double-clicks the "Purchase" button quickly, or sends concurrent API requests, both transactions might read the _same_ initial balance, deduct the cost, and write back, effectively granting double the credits/promotions for the price of one. (Note: The webhooks _do_ use `pg_advisory_xact_lock`, but the server actions do not).

#### 2. Webhook "Limbo" & 400 Error Loops

**The Flaw:** In `src/app/api/onboarding-fee/webhook/route.ts`, if the payment amount is less than expected, the code returns a `400 Bad Request`.
**The Risk:** Payment gateways like IntaSend interpret `4xx` and `5xx` responses as a failure to deliver the webhook and will continually retry sending it. Meanwhile, the user's money has been deducted from their M-Pesa/Bank, but the platform refuses to acknowledge it. This creates a state of financial limbo.

#### 3. Subscription Date Drift & Metadata Vulnerability

**The Flaw:** \* **Date Math:** In `src/app/api/subscription/webhook/route.ts`, the expiration date is set via `endDate.setDate(endDate.getDate() + 30)`. This will cause subscription billing dates to drift backwards for months with 31 days, and fail severely in February, frustrating users who expect a true "monthly" cycle.

- **Metadata Reliance:** The webhook relies entirely on `meta.userId` and `meta.plan` sent from IntaSend. If IntaSend drops or flattens metadata arrays during API transit (a common gateway issue), the webhook throws a 400 and fails to credit the user.

#### 4. Audit Log Pollution

**The Flaw:** When the onboarding fee webhook successfully grants verification access, it logs the action to `AdminLog` using `adminId: user.id`.
**The Risk:** `AdminLog` is designed for tracking _staff_ actions/waive-fee/route.ts]. Injecting standard user IDs into the `adminId` column will break admin auditing dashboards and falsely flag standard users as having administrative privileges in security reviews.

#### 5. DRY Violations & Hardcoded Pricing

**The Flaw:** Pricing constants are scattered and duplicated. `ONBOARDING_FEE_AMOUNT = 500` is hardcoded in `actions/revenue.ts`. However, `PAYMENT_AMOUNTS.ONBOARDING_FEE = 500` is also defined in `lib/intasend.ts`.
**The Risk:** When business requirements change and the fee is updated, a developer will likely update one file and miss the other, resulting in a state where a user pays 600 KES via IntaSend, but only 500 KES is deducted via the internal Wallet flow.

#### 6. UI "Dead Ends" in the Wallet

**The Flaw:** In `src/app/wallet/page.tsx` (the active Provider wallet page), the "Top Up" and "Withdraw" buttons are purely decorative HTML (`<button className="..."> <Plus /> Top Up </button>`). They have no `onClick` handlers, no modals attached, and no routing. Providers viewing their wallet have absolutely no way to actually top up or withdraw their funds from this page.

---

### Part 2: Advanced Remediation Plan

To properly fix the financial engine, you must implement the following code-level changes:

#### Phase 1: Securing the Transaction Layer (Critical)

1.  **Implement Row-Level Locking:** Refactor all database calls in `src/app/actions/revenue.ts`. Before reading the wallet balance, execute raw SQL: `await tx.$executeRaw\`SELECT \* FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE\`;`. This guarantees no concurrent requests can mutate the balance simultaneously.
2.  **Centralize Pricing Constants:** Create a single source of truth (e.g., `src/lib/constants/pricing.ts`). Remove hardcoded prices from `revenue.ts`, `intasend.ts`, and `route.ts`. All modules must import from this single config file.

#### Phase 2: Bulletproofing Webhooks & External APIs

1.  **Acknowledge & Flag Partial Payments:** In `src/app/api/onboarding-fee/webhook/route.ts`, if the `amount < PAYMENT_AMOUNTS.ONBOARDING_FEE`, **return a 200 OK** to IntaSend to stop retries. Instead of rejecting the payload, log a `Transaction` of type `PARTIAL_PAYMENT` with a status of `REQUIRES_RESOLUTION`. This allows customer support to see the underpayment and contact the user.
2.  **Redundant Payload Identifiers:** In the Subscription webhook, do not rely solely on `meta`. When creating the checkout session in `src/app/api/subscription/initiate/route.ts`, encode the data into the `api_ref` (e.g., `SUB_{userId}_{plan}_{timestamp}`). In the webhook, if `meta` is missing, parse the `api_ref` string as a fallback to ensure the user gets credited.
3.  **Fix System Audit Logs:** Change the onboarding webhook audit log to use a dedicated `SYSTEM_ID` for automated actions, rather than the `user.id`. E.g., `adminId: "SYSTEM_AUTO_VERIFY"`.

#### Phase 3: Fixing Time & Math Logic

1.  **Gross vs. Net Financial Fix:** In `src/app/api/provider/earnings/route.ts`, import `calculateBookingBreakdown(price, discount)` from `src/lib/financials.ts`. The `totalEarnings` `.reduce()` function must sum the `netAmount` property of the breakdown, not the raw `price`.
2.  **Fix Subscription Expiration Math:** Replace `.setDate(+30)` with proper month addition in `src/app/api/subscription/webhook/route.ts`.
    ```javascript
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Properly handles varying month lengths
    ```
3.  **Timezone Normalization in Charts:** In `src/app/api/provider/earnings/chart/route.ts`, ensure that the `createdAt` dates are normalized to the user's local timezone (or standard EAT) before extracting `.getDay()`, otherwise midnight transactions will be assigned to the wrong day on the UI.

#### Phase 4: Connecting the UI Wires

1.  **Wire up the Provider Wallet:** In `src/app/wallet/page.tsx`, import the `TopUpModal` and `WithdrawModal` components (or route to dedicated pages). Attach `onClick` handlers to the Top Up and Withdraw buttons.
2.  **Unlock the Client Wallet:** Remove the "Coming Soon" `div` and the `opacity-50 pointer-events-none` classes from the main wrapper in `src/app/client/wallet/page.tsx`.
3.  **Dynamic Client Routing:** Modify the IntaSend redirect payload in `src/app/api/wallet/topup/route.ts`. Check `session.user.role`—if they are a Client, redirect them to `/client/wallet/topup-complete`. If Provider, send them to `/dashboard/wallet/topup-complete`.

This level of analysis moves beyond standard bug hunting into **systems architecture, concurrency, and financial integrity**. If this platform goes live with the current codebase, you are mathematically guaranteed to suffer from double-spend exploits, lost webhooks, caching panics, and database deadlocks.

Here is an advanced, deep-dive forensic audit of the hidden architectural flaws in the Financial Systems.

---

### 1. Database Idempotency & The "Lost Money" Flaw

In `src/app/api/wallet/webhook/route.ts`, when the IntaSend webhook arrives, the system attempts to ensure the payment isn't processed twice using this logic:

```javascript
const idempotencyRef = String(invoiceId || apiRef);
await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyRef}))`;

const alreadyProcessed = await tx.transaction.findFirst({
  where: { description: { contains: `Ref: ${idempotencyRef}` } },
});
```

**The Fatal Flaws:**

- **`hashtext()` Collisions:** You are using PostgreSQL's `hashtext()` to generate an advisory lock. `hashtext()` returns a 32-bit integer. In a high-volume system, the pigeonhole principle guarantees **hash collisions**. If two completely different `invoiceId`s hash to the same 32-bit integer simultaneously, one webhook will block the other, potentially causing a timeout and a lost top-up.
- **The Substring Exploit:** The idempotency check searches the database using `contains`. If a previous transaction was processed with the description `"Ref: 12345"`, and a new webhook arrives for `invoiceId: "123"`, the `contains` clause will match the old record. The system will silently ignore the new webhook, assuming it was already processed. The user's money is gone, and no balance is credited.

**The Fix:**
You must add a dedicated `providerRef` column to the `Transaction` table with a `UNIQUE` constraint. Perform a strict equality check (`equals`), not a `contains` check, and catch the unique constraint violation for true, native database idempotency.

### 2. The "Free Money" Concurrency Exploit

In `src/app/actions/revenue.ts`, all purchases (credits, onboarding fees, service promotions) rely on application-level read/write logic:

```javascript
// 2. Check Balance
if (Number(wallet.balance) < pack.price) throw new Error(...);
// 3. Deduct Cost
const newBalance = Number(wallet.balance) - pack.price;
// 5. Update Wallet
await tx.wallet.update({ data: { balance: newBalance } });
```

**The Fatal Flaw:**
This is a classic **Double-Spend Vulnerability** (Race Condition). If a user with KES 1,000 in their wallet clicks the "Purchase KES 1,000 package" button rapidly 5 times (or intercepts the request and replays it 5 times simultaneously):

1. All 5 requests read the database at the exact same millisecond.
2. All 5 requests see `wallet.balance === 1000`.
3. All 5 requests pass the `if` check.
4. All 5 requests calculate `1000 - 1000 = 0`.
5. All 5 requests write `0` back to the database.
   _The user just bought KES 5,000 worth of credits for KES 1,000._

**The Fix:**
Do not calculate the new balance in JavaScript memory. You must use atomic database decrements natively in Prisma:

```javascript
await tx.wallet.update({
  where: { id: wallet.id },
  data: { balance: { decrement: pack.price } },
});
```

_Crucially_, you must also add a `CHECK (balance >= 0)` constraint directly inside your PostgreSQL database to immediately fail transactions that attempt to spend below zero.

### 3. Floating-Point Math vs. Currency

Look at the type-casting throughout the code:

- `const amount = Number(...)`
- `const exciseDuty = Math.round((discountedBase * EXCISE_DUTY_RATE) * 100) / 100;`

**The Fatal Flaw:**
JavaScript uses IEEE 754 double-precision floats for `Number`. Floats cannot accurately represent base-10 decimals. Over thousands of transactions, excise duties, and trust fee calculations, micro-fractions of pennies will begin to drift. If Prisma is mapped to a `Float` column in the database instead of a `Decimal` type, your general ledger will eventually fail to reconcile with IntaSend payouts due to rounding errors.

**The Fix:**
You must ensure the Prisma schema uses `Decimal` for all currency fields. In TypeScript, use a library like `decimal.js` or `currency.js` to handle all math, or multiply everything by 100 and store it as integers (cents), dividing only when rendering to the UI.

### 4. Next.js App Router Caching Panic

Look at the Server Component in `src/app/wallet/page.tsx`:

```javascript
export default async function WalletPage() {
  const wallet = await prisma.wallet.findUnique({...});
  return ( <div> {Number(wallet.balance).toLocaleString()} </div> );
}
```

**The Fatal Flaw:**
In Next.js App Router, Server Components fetching data without specific dynamic configuration are heavily cached. When a user clicks "Top Up", pays via IntaSend, and the webhook updates their balance, the user is redirected back to `/wallet`.
Because this route is cached, **Next.js will serve the old HTML containing their old balance.** The user will immediately panic, assuming the platform stole their money, and flood your support queue.

**The Fix:**
You must force this route to always render dynamically on request. Add this to the top of `wallet/page.tsx`:
`export const dynamic = 'force-dynamic';`
Alternatively, use Next.js `revalidatePath('/wallet')` inside the Top-Up completion UI or the webhook itself (though webhooks shouldn't generally handle UI cache invalidation).

### 5. Promo Code "Unkillable Fees"

Look at `src/lib/financials.ts` regarding discounts:

```javascript
const discountedBase = Math.max(0, base - discount);
const exciseDuty = Math.round(discountedBase * EXCISE_DUTY_RATE * 100) / 100;
const trustFee = Math.round(base * TRUST_FEE_RATE * 100) / 100;
const totalAmount =
  Math.round((discountedBase + exciseDuty + trustFee) * 100) / 100;
```

**The Fatal Flaw:**
If you give a user a "100% OFF" promo code (where `discount == base`), `discountedBase` becomes `0`. The `exciseDuty` becomes `0`.
However, the `trustFee` is calculated against the _original_ `base`. Therefore, a "Free" service will still output a `totalAmount` of the Trust Fee (e.g., KES 50). If the user's wallet is completely empty, they will be unable to use a 100% free promo code because the platform will still attempt to charge them the trust fee.

**The Fix:**
Business logic needs to dictate who eats the Trust Fee on a fully discounted service. If it's a 100% discount, `trustFee` should likely be waived or absorbed by the platform's promo budget, otherwise "100% Free" is legally deceptive marketing.

## (EVEN BETTER)

I audited the financial systems feature across the codebase and there are several real breaks, plus a few places where the implementation exists but the flow is fragmented or misleading.

Here is the practical diagnosis.

## Overall pattern

The biggest problem is not one isolated bug. It is **feature fragmentation**:

- multiple parallel implementations for the same financial behavior
- inconsistent API contracts between frontend and backend
- success pages that assume completion before webhook settlement is confirmed
- pages that exist visually but are not wired to the real payment state
- some endpoints and UI hooks referencing routes that do not exist

That means users can hit pages that look complete while the actual financial state is either missing, delayed, or stored elsewhere.

---

# 1. Wallet

## Broken data flows

### 1.1 `/api/wallet/transactions` is querying the wrong shape

File: `src/app/api/wallet/transactions/route.ts`

Problem:

- it builds `where` as `{ userId: session.user.id }`
- but `Transaction` has no `userId` field in Prisma
- `Transaction` belongs to `Wallet` via `walletId`

Impact:

- this endpoint is broken logically and likely at runtime
- filtering and history retrieval will fail or return nothing depending on type safety escape

Fix:

- query through the relation:

```ts
where: {
  wallet: { userId: session.user.id },
  ...(type ? { type } : {})
}
```

---

### 1.2 Wallet frontend hooks expect a response envelope the API does not return

Files:

- `src/hooks/queries/useWallet.ts`
- `src/lib/api/endpoints.ts`
- `src/types/api.ts`
- backend wallet routes under `src/app/api/wallet/*`

Problem:

- `useWalletBalance` expects `{ success, data }`
- `/api/wallet/balance` returns raw `{ balance, currency }`
- `useTransactions` expects `ApiResponse<Transaction[]>`
- `/api/wallet/transactions` returns `{ items, total, page, pageSize, hasMore }`

Impact:

- frontend query hooks under `src/hooks/queries/useWallet.ts` are incompatible with the actual API contract
- those hooks will break if used

Fix:

- standardize all financial APIs to one contract, preferably:

```ts
{ success: true, data: ... }
```

or remove `ApiResponse<T>` assumptions and use raw payloads consistently.

---

### 1.3 Wallet endpoint constants point to routes that do not exist

Files:

- `src/lib/api/endpoints.ts`
- actual routes in `src/app/api/wallet/*`

Problems:

- `topUp: "/wallet/top-up"` but actual route is `/api/wallet/topup`
- `withdraw: "/wallet/withdraw"` does not exist
- `paymentMethods` endpoints do not exist
- `addPaymentMethod` and `deletePaymentMethod` endpoints do not exist

Impact:

- any consumer of the central endpoint map will 404
- the “typed API layer” is not trustworthy for wallet features

Fix:

- either implement the missing endpoints or remove them from the centralized API map until they exist
- rename `topUp` to match the actual route

---

### 1.4 Two separate wallet frontend implementations are out of sync

Files:

- `src/hooks/queries/useWallet.ts`
- `src/hooks/mutations/useWalletMutations.ts`
- `src/lib/api/hooks/useWallet.ts`

Problem:

- there are two wallet hook systems
- one uses centralized endpoints and `ApiResponse`
- the other directly calls `/wallet`, `/wallet/topup`
- they model transactions differently

Impact:

- duplicated state contracts
- one path can work while the other silently rots
- hard to maintain and very easy to break UI pages later

Fix:

- collapse to one wallet client module
- one set of hooks
- one transaction type definition
- one source of truth for endpoint paths

---

### 1.5 `/client/wallet` still runs an old verify flow even though verify is disabled

Files:

- `src/app/client/wallet/page.tsx`
- `src/app/api/wallet/verify/route.ts`
- `src/lib/api/hooks/useWallet.ts`

Problem:

- client wallet checks `payment_status=success&ref=...`
- then calls `useVerifyTopUp`
- but verify endpoint is intentionally disabled
- hook now fakes success and only invalidates cache

Impact:

- UI can claim payment success without any settlement proof
- this is especially risky in financial flows

Fix:

- remove client-side verify mutation entirely
- rely only on webhook-settled state
- replace with polling against wallet balance or transaction reference status

---

### 1.6 Wallet webhook depends on parsing user id out of `api_ref`

Files:

- `src/app/api/wallet/topup/route.ts`
- `src/app/api/wallet/webhook/route.ts`

Problem:

- webhook extracts a user id fragment from `api_ref`
- if `generateApiRef` changes format, settlement breaks
- no `Payment` or pending top-up record exists to reconcile against

Impact:

- brittle payment correlation
- impossible to inspect pending/failed/completed topups cleanly

Fix:

- create a pending `Payment` or `WalletTopUp` record before checkout
- store `userId`, `apiRef`, `sessionId`, `amount`, `status`
- webhook should resolve by `apiRef/sessionId`, not string splitting

---

### 1.7 No first-time wallet bootstrap on wallet page

File: `src/app/wallet/page.tsx`

Problem:

- `/api/wallet` auto-creates a wallet if missing
- but `/wallet` page directly queries Prisma and returns “Wallet not found”

Impact:

- first-time users can hit a dead-end page even though the API handles bootstrap correctly

Fix:

- make page use the same bootstrap logic or create wallet server-side if missing

---

## Broken UI flows

### 1.8 Wallet success page redirects to the wrong destination

File: `src/app/dashboard/wallet/topup-complete/page.tsx`

Problem:

- it says “Redirecting to wallet...”
- but actually redirects to `/dashboard/earnings`

Impact:

- user finishes a wallet top-up and lands on earnings, not wallet
- very confusing state transition

Fix:

- redirect to `/wallet` or the correct wallet dashboard
- then show a “pending settlement / confirmed” state based on webhook result

---

### 1.9 `/client/wallet` is visually built but functionally blocked

File: `src/app/client/wallet/page.tsx`

Problem:

- full-page “Coming Soon” overlay disables the entire page
- but the page still contains live hooks and top-up logic underneath

Impact:

- dead UI surface
- misleading code path
- unclear whether feature is available or not

Fix:

- either remove the page from navigation until ready
- or make it genuinely usable and bind it to real routes

---

### 1.10 Wallet actions are incomplete

Files:

- `src/components/revenue/WalletActions.tsx`
- `src/app/wallet/page.tsx`

Problem:

- page shows “Top Up” and “Withdraw” buttons that are not wired
- `WalletActions` only opens buy-credits modal
- top-up UI is not surfaced on the actual wallet page

Impact:

- broken affordance: visible controls do nothing or mismatch user expectations

Fix:

- add a real top-up modal/button wired to `/api/wallet/topup`
- either implement withdraw or remove it until complete

---

# 2. Provider earnings

## Broken data flows

### 2.1 Earnings are calculated from bookings, not real settled payments

File: `src/app/api/provider/earnings/route.ts`

Problem:

- total earnings are derived from completed bookings using `service.price` or `job.budget`
- chart and stats use `Payment`
- payouts are mocked as empty

Impact:

- three different financial truth sources:
  - bookings
  - payments
  - fake payouts

- earnings totals can disagree across widgets

Fix:

- define one accounting truth:
  - either completed `Payment` records
  - or a dedicated provider ledger

- earnings total, chart, payout history, and dashboard cards must all read from the same source

---

### 2.2 `last-month` range is wrong

File: `src/app/api/provider/earnings/route.ts`

Problem:

- `endDate` is calculated but never used

Impact:

- “last month” actually means “from first day of last month until now”

Fix:

- apply both `gte: startDate` and `lt: startOfThisMonth`

---

### 2.3 API shape is presentation-oriented, not data-oriented

File: `src/app/api/provider/earnings/route.ts`

Problem:

- it returns formatted strings like `"KES 10,000"` inside the API

Impact:

- hard to reuse in charts, exports, totals, comparisons
- formatting logic leaks into backend responses

Fix:

- return numeric amounts
- format only in UI

---

### 2.4 Payout history is not implemented

File: `src/app/api/provider/earnings/route.ts`

Problem:

- `payouts` is hardcoded `[]`

Impact:

- dashboard export and payout sections are effectively fake

Fix:

- either implement payout ledger records
- or remove payout UI until payout tracking exists

---

## Broken UI flows

### 2.5 Earnings dashboard is only partially connected

Files:

- `src/app/dashboard/earnings/page.tsx`
- `src/lib/api/hooks/useProvider.ts`
- `src/app/api/provider/earnings/chart/route.ts`
- `src/app/api/provider/stats/route.ts`

Problem:

- page imports only `useProviderEarnings`
- chart and stats endpoints exist, but the page does not appear to consume them through the documented hooks

Impact:

- feature inventory says chart + stats exist, but the main dashboard flow does not fully reflect that system

Fix:

- wire the page to:
  - `useProviderStats()`
  - `useProviderEarningsChart()`
  - `useProviderEarnings(range)`

---

# 3. Onboarding fee

## Broken data flows

### 3.1 Two separate onboarding payment systems exist

Files:

- `src/app/actions/revenue.ts` (`payOnboardingFee`)
- `src/app/api/onboarding-fee/initiate/route.ts`
- `src/app/api/onboarding-fee/webhook/route.ts`

Problem:

- one flow deducts from wallet instantly
- another flow uses IntaSend checkout + webhook

Impact:

- two competing sources of truth
- profile flags and audit logs can diverge depending on which flow is used

Fix:

- choose one canonical flow:
  - wallet-funded onboarding fee
  - or gateway checkout

- if both are supported, they must both create the same `Payment`/ledger entries and state transitions

---

### 3.2 Onboarding webhook and wallet action update different profile fields

Files:

- `src/app/actions/revenue.ts`
- `src/app/api/onboarding-fee/webhook/route.ts`

Problem:

- wallet action sets:
  - `hasPaidOnboardingFee`
  - `verificationStatus`
  - `isVerified`
  - `premiumPricingEnabled`
  - `premiumMultiplier`

- webhook sets:
  - `hasPaidOnboardingFee`
  - `verificationStatus`
  - `premiumPricingEnabled`
  - `premiumMultiplier`

- `isVerified` is not set in webhook path

Impact:

- same business event can leave different profile state depending on path

Fix:

- centralize profile activation into one service function, used by both paths

---

### 3.3 Admin fee waiver grants access without a financial ledger record

File: `src/app/api/admin/users/[id]/waive-fee/route.ts`

Problem:

- waiver updates verification/access flags
- no transaction or audit-side financial record is created in wallet history

Impact:

- from a reconciliation standpoint, granted access looks disconnected from the finance system

Fix:

- add a transaction or access-grant ledger entry with type like `ONBOARDING_FEE_WAIVER`
- keep audit logs and financial history aligned

---

## Broken UI flows

### 3.4 Success page assumes payment completion before webhook settlement is confirmed

Files:

- `src/components/revenue/OnboardingFeeModal.tsx`
- `src/app/dashboard/onboarding-complete/page.tsx`

Problem:

- user is redirected to a success page immediately after checkout redirect
- page toasts “You are now verified...”
- but actual activation depends on webhook processing

Impact:

- false-positive success state
- user may land back before webhook completes

Fix:

- success page should be a **processing** page, not a final success page
- it should poll `/api/profile` or a dedicated onboarding-fee status endpoint until `hasPaidOnboardingFee === true`

---

### 3.5 Critical activation banner can be dismissed permanently via localStorage

File: `src/components/revenue/OnboardingAccessNotice.tsx`

Problem:

- user can dismiss the banner even if activation is still required

Impact:

- required next step disappears
- provider remains blocked but may not see why

Fix:

- allow dismiss only for session-level snooze
- or keep a compact persistent banner until activation/waiver is complete

---

# 4. Subscriptions and premium plans

## Broken data flows

### 4.1 Subscription webhook is inconsistent with other IntaSend webhooks and likely rejects valid events

File: `src/app/api/subscription/webhook/route.ts`

Problems:

- it verifies signature first, then separately enforces `challenge`
- wallet/onboarding webhooks handle challenge differently
- this route seems to expect `challenge` on normal payment events too

Impact:

- subscription activation can silently fail even after checkout succeeds

Fix:

- use the same shared IntaSend webhook parsing/verification logic as wallet and onboarding
- challenge handling should only apply to challenge calls, not standard event processing

---

### 4.2 Subscription initiation uses a different payment integration style

File: `src/app/api/subscription/initiate/route.ts`

Problem:

- wallet/onboarding use shared IntaSend helpers/SDK
- subscription uses a direct `fetch` call with a separate payload style

Impact:

- duplicated gateway integration logic
- harder to maintain and easier to drift

Fix:

- move subscription payment initiation onto the shared IntaSend service layer

---

### 4.3 No durable payment record for subscription payments

Files:

- `src/app/api/subscription/initiate/route.ts`
- `src/app/api/subscription/webhook/route.ts`

Problem:

- subscription flow updates `Subscription`
- but there is no pending/settled `Payment` record or transaction ledger entry

Impact:

- no financial audit trail
- reconciliation page cannot see subscription revenue lifecycle

Fix:

- create a financial record at initiation
- mark it settled in webhook
- tie it to user and plan

---

## Broken UI flows

### 4.4 Premium page has fragile mobile state logic

File: `src/app/dashboard/premium/page.tsx`

Problem:

- component calls `useState` inside a `typeof window !== "undefined"` conditional block

Impact:

- this is invalid React hook usage and can lead to unstable rendering/hydration behavior

Fix:

- replace with `useEffect(() => setIsMobile(window.innerWidth < 768), [])`
- or use CSS-first responsive layout and remove JS mobile detection entirely

---

### 4.5 Premium upgrade flow lacks a proper post-checkout confirmation state

Files:

- `src/app/dashboard/premium/page.tsx`
- `src/app/api/subscription/initiate/route.ts`

Problem:

- user is sent to checkout
- redirect returns to profile
- no plan-activation waiting page is shown
- no polling state is presented

Impact:

- plan upgrade feels random
- user may return before webhook has updated subscription

Fix:

- add `/dashboard/premium/complete`
- show processing state
- poll `/api/subscription/status` until active

---

# 5. Promo codes

## Broken data flows

### 5.1 Promo validation is case-sensitive while creation uppercases codes

Files:

- `src/lib/promo.ts`
- `src/app/actions/promo.ts`
- booking/sidebar UI

Problem:

- created promo codes are stored uppercase
- validator uses `findUnique({ where: { code } })`
- entered lowercase codes fail

Impact:

- valid codes appear invalid

Fix:

- normalize input with `code.trim().toUpperCase()` before lookup

---

### 5.2 Admin promo creation only supports a partial model

Files:

- `src/app/actions/promo.ts`
- `prisma/schema.prisma`
- `src/app/admin/marketing/promos/page.tsx`

Problem:

- `PromoCode` model supports richer fields like date windows, per-user limits, max discount amount
- create action only exposes:
  - code
  - type
  - value
  - minOrder
  - limit
  - description

Impact:

- admin module exists but cannot fully manage promo economics

Fix:

- expand promo admin form and action to support all fields in the model

---

# 6. Revenue actions

## Broken data flows

### 6.1 Credit purchase is wallet-ledger based, but wallet top-up flow is gateway-ledger based with no unified accounting service

Files:

- `src/app/actions/revenue.ts`
- wallet routes

Problem:

- credit purchases deduct `Wallet.balance`
- wallet topups increment `Wallet.balance`
- but there is no central ledger service or reconciliation abstraction

Impact:

- accounting logic is scattered across routes and server actions
- easy to introduce drift in balances and transaction semantics

Fix:

- create a shared financial service:
  - `creditWallet(...)`
  - `debitWallet(...)`
  - `recordTransaction(...)`
  - `applyOnboardingActivation(...)`
  - `activateSubscription(...)`

---

### 6.2 Reconciliation page only covers booking/payment lifecycle, not broader finance events

Files:

- `src/app/admin/reconciliation/page.tsx`
- `src/app/actions/admin.ts`

Problem:

- reconciliation currently inspects booking/payment mismatches only
- it does not cover:
  - wallet topups
  - onboarding fee settlements
  - subscriptions
  - credit purchases
  - promo economic impact

Impact:

- admin reconciliation exists, but not for the full financial system described in the feature spec

Fix:

- expand reconciliation scope into:
  - wallet funding events
  - onboarding fee payments/waivers
  - subscription payments
  - wallet debits for credits/promotions
  - orphaned gateway webhooks

---

# Highest-priority fix plan

## Phase 1 — stop incorrect states

1. Fix `/api/wallet/transactions` relation query.
2. Fix `topup-complete` redirect to wallet.
3. Remove fake client-side top-up verification path.
4. Convert onboarding and subscription success pages into processing/polling pages.
5. Fix invalid hook usage in premium page.

## Phase 2 — unify contracts

1. Standardize all wallet/subscription/earnings API responses.
2. Remove duplicate wallet hook systems and keep one.
3. Align endpoint constants with actual route paths.
4. Remove references to non-existent withdraw/payment-method routes until implemented.

## Phase 3 — create one financial domain service

Introduce a shared service layer for:

- wallet creation/bootstrap
- wallet credit/debit
- transaction logging
- payment initiation record creation
- webhook settlement handling
- onboarding activation
- subscription activation

This is the biggest architecture improvement.

## Phase 4 — add proper ledger records

Add durable records for:

- pending wallet topups
- settled topups
- onboarding fee payments and waivers
- subscription payments
- promotion payments
- credit purchases

That gives you real reconciliation.

## Phase 5 — repair UX flows

1. Wallet page:
   - real top-up modal
   - proper transaction history
   - remove dead withdraw actions unless implemented

2. Onboarding fee:
   - persistent activation notice
   - processing page after checkout

3. Premium:
   - processing page after checkout
   - live plan refresh

4. Earnings:
   - wire stats + chart + payouts from one truth source

---

# Recommended final architecture

For this feature, the clean structure should be:

- **Payment initiation**
  creates a pending payment record first

- **External checkout**
  only returns checkout URL + payment reference

- **Webhook**
  is the only place that marks settlement complete

- **Ledger service**
  applies business effects:
  - wallet topup
  - onboarding activation
  - subscription activation
  - transaction creation

- **UI completion pages**
  never assume success
  they poll for confirmed state

That will eliminate most of the current broken flows.

## HEY NOTHING IN THIS DOC SHOULD BE IGNORED
