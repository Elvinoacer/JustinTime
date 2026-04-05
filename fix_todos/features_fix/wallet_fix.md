Yes. I checked the wallet implementation in this codebase, and it is broken in several important ways.

The core problem is this: the project treats the wallet as both a balance and a ledger, but the ledger is too weak to represent payment reality. Because of that, the UI cannot truthfully show status, verification, pending state, failure state, or reconciliation.

Here is the full diagnosis and how to fix it.

## What is broken

### 1. Transactions do not have a status

In `prisma/schema.prisma`, `Transaction` has `amount`, `type`, `providerRef`, and `description`, but no `status`, no `currency`, no `externalId`, no `settledAt`, no `failedAt`, no `metadata`, no `source`, no `payment gateway response`, no `reversal linkage`.

That means the system cannot properly represent:

- pending top-up
- settled top-up
- failed top-up
- reversed top-up
- disputed payment
- duplicate callback ignored
- manual admin correction

Right now the code fakes status by putting words like `Pending` or `Settled` in `description` and by changing `providerRef` from `INTASEND:WALLET:PENDING:...` to `INTASEND:WALLET:SETTLED:...` in `src/app/api/wallet/topup/route.ts` and `src/app/api/wallet/webhook/route.ts`.

That is not durable financial modeling.

### 2. The UI cannot show real payment state

The client wallet page at `src/app/client/wallet/page.tsx` only shows:

- current wallet balance
- a top-up input
- transactions

But it does **not** show:

- top-up currently awaiting webhook confirmation
- failed gateway attempt
- overpaid / underpaid case
- settlement delay
- verification reference
- payment channel status
- gateway callback status
- whether the displayed deposit is pending or settled

So users will see a “deposit-looking” row without knowing whether it is actually usable money.

### 3. Pending top-ups are stored as normal DEPOSIT transactions

In `src/app/api/wallet/topup/route.ts`, the system creates a transaction immediately when checkout is initiated:

- `type: "DEPOSIT"`
- `providerRef: INTASEND:WALLET:PENDING:${apiRef}`
- `description: Wallet Top-up Pending [...]`

This is bad because `DEPOSIT` is already being used as if it means a successful credit in the UI. A pending payment should not be the same semantic transaction type as a settled deposit.

### 4. Transaction history lies by implication

In `src/app/client/wallet/page.tsx`, any `DEPOSIT` or `REFUND` is rendered green and treated as credit. There is no distinction between:

- initiated
- pending
- processing
- confirmed
- failed
- reversed

So the page implies that all deposits are good money, even when they are just initiated payment intents.

### 5. Top-up completion pages do not confirm settlement

Both:

- `src/app/dashboard/wallet/topup-complete/page.tsx`
- `src/app/client/wallet/topup-complete/page.tsx`

show a “processing” message and redirect after 2 seconds, but they do not:

- poll for settlement
- show the payment reference
- show failure timeout
- show “still pending”
- link the user to a specific transaction
- refresh wallet state robustly

This creates uncertainty and support tickets.

### 6. `/api/wallet` and `/api/wallet/transactions` expose different truths

`src/app/api/wallet/route.ts` returns wallet with only the last 10 transactions.
`src/app/api/wallet/transactions/route.ts` supports pagination.

But the client wallet page uses `useWallet()` from `src/lib/api/hooks/useWallet.ts`, not the paginated transactions endpoint. So:

- filters only operate on the last fetched subset
- “View All” is fake
- monthly stats are computed from incomplete data
- exports/history are misleading

### 7. Wallet balance is updated, but there is no strong reconciliation model

`src/app/api/wallet/webhook/route.ts` does use signature verification and advisory locking, which is good. But there is still no proper payment record linked to wallet top-ups.

The wallet system should not rely on `Transaction` alone to represent gateway state. You already have a `Payment` model, but it is tied to `bookingId` and cannot represent wallet top-ups. So wallet funding has no first-class payment entity.

That is a major design hole.

### 8. No source-of-truth record for wallet funding attempts

A top-up currently becomes:

- checkout created externally
- pending transaction row created internally
- webhook maybe arrives
- wallet balance maybe incremented
- transaction maybe mutated to settled

What is missing is a dedicated funding record like:

- `WalletTopUp` or generic `WalletLedgerEntry`
- expected amount
- received amount
- gateway session id
- apiRef
- state machine
- webhook payload snapshot
- settlement timestamps
- failure reason

Without that, debugging and support are hard.

### 9. No explicit failed-state handling

In `src/app/api/wallet/webhook/route.ts`, non-`COMPLETE` states are just acknowledged and returned. They are not persisted into a failure or cancelled state for the wallet transaction.

So if payment fails at the gateway:

- the user may still have a pending-looking entry forever
- support/admin cannot clearly tell what happened
- stale pending entries accumulate

### 10. Stale pending entries are possible

The admin reconciliation code in `src/app/actions/admin.ts` already hints this is happening. It looks for old pending wallet events based on `providerRef` prefixes and open age.

That means the system already knows wallet payment intents can get stuck in limbo.

### 11. Provider and client wallets are inconsistent

Provider wallet:

- server-rendered page
- reads directly from Prisma
- shows 20 transactions
- has credits alongside cash

Client wallet:

- client-rendered page
- reads via React Query
- shows only what `/api/wallet` returns
- has a richer UI but weaker truthfulness

This is two separate wallet experiences on top of the same data model. That almost always leads to drift and bugs.

### 12. There is no admin-grade audit trail for wallet corrections

There are transactions, but not enough structured auditability for:

- who manually adjusted balance
- why it was adjusted
- what original payment reference it corrected
- before/after balance snapshot
- reversal links

Financial systems need this.

### 13. No computed “available balance” vs “pending balance”

Only `balance` exists on `Wallet`.

A real wallet should usually expose at least:

- availableBalance
- pendingIncoming
- pendingOutgoing
- reservedBalance, if relevant

Right now pending top-ups are not separated cleanly from usable money at the model level or the UI level.

### 14. Transaction descriptions are overloaded with business meaning

The current implementation uses `description` as a data carrier:

- pending/settled wording
- reference text
- payment meaning

Descriptions should be display text, not a primary state mechanism.

---

## The real fix

You should rebuild the wallet around three layers:

1. **Wallet account**
2. **Wallet ledger entries**
3. **Gateway payment/funding records**

## Recommended data model changes

### A. Keep `Wallet`, but strengthen it

Add fields like:

- `currency`
- `availableBalance`
- `pendingBalance`
- `updatedAt`

Or keep `balance` as available balance and compute pending separately, but be explicit.

### B. Replace weak `Transaction` semantics with a proper ledger

Either evolve `Transaction` or create `WalletLedgerEntry`.

Add fields:

- `direction` (`CREDIT` | `DEBIT`)
- `status` (`PENDING` | `PROCESSING` | `SETTLED` | `FAILED` | `REVERSED` | `CANCELLED`)
- `category` (`TOPUP`, `BOOKING_PAYMENT`, `REFUND`, `CREDIT_PURCHASE`, `PROMOTION_PAYMENT`, `EARNING`, `ADJUSTMENT`)
- `currency`
- `gateway`
- `gatewayReference`
- `gatewaySessionId`
- `providerRef`
- `sourceType`
- `sourceId`
- `metadata Json`
- `settledAt`
- `failedAt`
- `reversedAt`
- `failureReason`
- `createdByType` (`SYSTEM`, `USER`, `ADMIN`, `WEBHOOK`)
- `createdById`

Also add indexes on:

- `walletId, createdAt`
- `status`
- `providerRef`
- `gatewayReference`

### C. Add a dedicated wallet funding model

Create `WalletTopUp` with fields like:

- `id`
- `userId`
- `walletId`
- `amountExpected`
- `amountReceived`
- `currency`
- `status`
- `gateway`
- `apiRef`
- `gatewaySessionId`
- `gatewayInvoiceId`
- `checkoutUrl`
- `initiatedAt`
- `confirmedAt`
- `failedAt`
- `rawInitiationPayload`
- `rawWebhookPayload`
- `failureReason`

This should become the source of truth for top-up lifecycle.

### D. Stop using `Payment` for only bookings

Your current `Payment` model is locked to `bookingId @unique`, so it cannot serve wallet funding. You have two options:

- generalize `Payment` to support multiple domains
- or keep booking payments separate and create `WalletTopUp`

For speed and clarity, I would create `WalletTopUp`.

---

## How the flow should work

### New top-up lifecycle

#### Step 1: initiate

`POST /api/wallet/topup`

- validate amount
- create/get wallet
- create `WalletTopUp` row with `status=PENDING`
- create ledger entry with `status=PENDING`, `category=TOPUP`, `direction=CREDIT`
- call IntaSend
- save `gatewaySessionId`, `checkoutUrl`, `apiRef`
- return those values

#### Step 2: user pays externally

User is redirected to checkout.

#### Step 3: redirect page lands back

Top-up complete page should:

- read `apiRef` or `sessionId`
- call new endpoint like `GET /api/wallet/topup/status?apiRef=...`
- poll every few seconds for up to maybe 60–90 seconds
- show one of:
  - Confirmed
  - Still processing
  - Failed
  - Could not confirm yet, check history

#### Step 4: webhook settles

Webhook should:

- verify signature
- locate `WalletTopUp` by `apiRef`
- acquire lock
- if already settled, exit idempotently
- record raw webhook
- if success:
  - update `WalletTopUp.status = SETTLED`
  - update ledger entry status to `SETTLED`
  - increment wallet balance
  - set `confirmedAt`

- if failure/cancel:
  - update `WalletTopUp.status = FAILED/CANCELLED`
  - update ledger entry status accordingly
  - do not touch wallet balance

#### Step 5: UI reflects truth

Wallet page should show:

- available balance
- pending top-ups
- failed top-ups
- transaction status badges
- transaction reference numbers

---

## What to change in the current code

### 1. Fix the schema first

Update `prisma/schema.prisma`.

At minimum:

- add `TransactionStatus`
- add `direction`
- add `currency`
- add `gatewayReference`
- add `gatewaySessionId`
- add `metadata Json?`
- add `settledAt`
- add `failureReason`

Better:

- add a new `WalletTopUp` model

### 2. Refactor `src/app/api/wallet/topup/route.ts`

Change it so it does **not** treat an initiated top-up as a normal settled deposit.

Instead:

- create `WalletTopUp`
- create pending ledger row
- return `topUpId`, `apiRef`, `checkoutUrl`

### 3. Refactor `src/app/api/wallet/webhook/route.ts`

This route should update:

- funding record
- ledger status
- wallet balance

It should not rely on description text to model state.

Also persist failed states, not just acknowledge them.

### 4. Add `GET /api/wallet/topup/status`

Given `apiRef` or `topUpId`, return:

- funding status
- expected amount
- received amount
- initiatedAt
- confirmedAt
- failureReason
- wallet transaction id if settled

That endpoint is what the top-up-complete pages should use.

### 5. Fix the top-up-complete pages

Both completion pages should:

- stop blind redirect-after-2-seconds behavior
- show payment reference
- poll status
- redirect only after confirmed or after user action
- offer “Refresh wallet”
- offer “View transaction history”

### 6. Split wallet API responses by responsibility

Change `/api/wallet` to return summary only:

- balance
- pending balance
- recent settled transactions
- recent pending transactions

Use `/api/wallet/transactions` for real history with:

- pagination
- filters by type/category/status/date

Then update `useWallet()` and the client wallet page to use the paginated endpoint for the history section.

### 7. Make UI status explicit

In `src/app/client/wallet/page.tsx` and provider wallet UI:

- green only for `SETTLED`
- amber for `PENDING` / `PROCESSING`
- red for `FAILED` / `REVERSED`
- gray for `CANCELLED`

Also show labels like:

- Pending confirmation
- Confirmed
- Failed
- Reversed

### 8. Unify provider and client wallet behavior

Keep different page layouts if you want, but both should consume the same wallet summary contract and the same transaction history contract.

### 9. Add admin tools

You need an admin wallet reconciliation screen with:

- filter by pending older than X minutes/hours
- view raw webhook payload
- view gateway refs
- mark as resolved
- manual credit/debit with mandatory reason
- audit trail for all manual adjustments

### 10. Add a real adjustment mechanism

Create controlled admin-only ledger entries:

- `category=ADJUSTMENT`
- `direction=CREDIT/DEBIT`
- required reason
- createdBy admin id
- linked source reference if correcting a top-up

Never silently mutate balances without a corresponding ledger row.

---

## Specific issues I would prioritize first

This is the order I would fix them in:

### Priority 1

- Add transaction/funding status model
- Stop representing pending top-ups as ordinary deposits
- Add top-up status endpoint
- Persist failed/cancelled webhook outcomes

### Priority 2

- Update wallet UI to show pending/failed/settled clearly
- Replace blind completion redirects with polling confirmation
- Use paginated transaction history instead of recent-only subset

### Priority 3

- Unify provider/client wallet contracts
- Add admin reconciliation and manual adjustment tools
- Add better audit metadata and external refs

---

## Concrete examples of current bad behavior

These are real user-facing failures in the current code:

- A user initiates a top-up and immediately sees a green-looking deposit-style item, but the money is not actually settled yet.
- A webhook fails or is delayed, and the user has no clear explanation on the wallet page.
- A failed payment can remain conceptually “pending” because failure state is not properly written into the ledger.
- Monthly totals in the client wallet can be wrong because they are calculated from only the last few loaded transactions.
- Provider and client wallets may show different slices of reality because they are fed differently.

---

## What “good” looks like

A healthy wallet should let the user answer these questions instantly:

- How much money can I spend now?
- Which top-ups are still pending?
- Which payment failed, and why?
- What was the reference number?
- When was this confirmed?
- Is this transaction reversible or disputed?
- Does support/admin see the exact same state I see?

Right now this project cannot answer those cleanly.

## Bottom line

The wallet is not just suffering from UI bugs. It has a **state-modeling problem**.

You can patch visuals, but the real fix is to introduce:

- first-class funding records
- first-class ledger statuses
- proper status-aware UI
- reconciliation-grade admin tooling
