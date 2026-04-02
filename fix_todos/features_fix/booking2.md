Based on a deep dive into the newly provided files (specifically the booking API routes, cancellation server action, and the client/provider dashboard pages), I have identified several critical data flow breaks, security loopholes, and missing UI elements. 

Here is an expanded, comprehensive plan to fix these newly discovered issues across the Booking System:

### 6.1 Booking Creation & Flow (Escrow Edge Cases)
**Identified Issues:**
* **Escrow Payment Synchronization:** When configuring milestones (`POST /api/bookings/[id]/escrow/milestones`), the system automatically creates a `WALLET` payment if one doesn't exist/escrow/milestones/route.ts]. However, this bypasses the standard IntaSend integration. If the user paid via mobile money (M-Pesa) or card during the checkout flow, creating a blind `WALLET` payment here breaks financial reconciliation. 

**Fix Plan:**
* Modify the milestone generation logic to validate against existing `Payment` records rather than blindly creating `WALLET` entries.
* Tie the milestone release trigger strictly to the `Payment` transaction IDs that are confirmed by the IntaSend webhook.

### 6.2 Booking Management (Critical Cancellation Loophole)
**Identified Issues:**
* **Bypassed Cancellation Engine:** In `client/bookings/page.tsx`, when a client clicks "Cancel", the UI makes a direct API call to `PATCH /api/bookings/[id]` with `{ status: "CANCELLED" }`. **This completely bypasses the robust `cancelBooking` server action** defined in `actions/cancellation.ts`. Consequently, the cancellation policy (FLEXIBLE, STRICT), penalty calculations, and refund logic are entirely skipped in production.
* **Incomplete Server Action:** Even if the `cancelBooking` server action is used, it stops at calculating the refund and updating the database, leaving the actual money movement as a comment: `// TODO: Trigger partial refund via Payment Gateway or Wallet logic`.
* **Missing Cancellation Reason Input:** The `api/bookings/[id]/route.ts` endpoint accepts a `cancellationReason` to record in the timeline/route.ts], but the client UI modal (`ConfirmModal`) only has a static confirmation button without a text input to capture this reason.

**Fix Plan:**
1. **Reroute Client UI:** Update `client/bookings/page.tsx` to use the `cancelBooking` server action instead of the direct `apiClient.patch` method.
2. **Implement Financial Refund:** Replace the `TODO` in `actions/cancellation.ts` with an actual call to the Wallet/IntaSend API to credit the client's wallet with the `calculation.refundAmount`.
3. **Update Cancellation Modal:** Add a required text area for "Cancellation Reason" in the `ConfirmModal` within both the client and provider dashboards.

### 6.2 Booking Management (Provider Status Override Security Flaw)
**Identified Issues:**
* **Arbitrary Escrow Release:** In the provider dashboard (`dashboard/bookings/page.tsx`), the "Edit Booking" modal allows the provider to manually change the booking status to `COMPLETED` via a dropdown menu. 
* Because `api/bookings/[id]/route.ts` intercepts the `COMPLETED` status and automatically executes the escrow release (`escrow.releasedAmount = escrow.totalAmount`)/route.ts], **a provider can unilaterally mark a job complete and steal the escrowed funds without the client's approval.**

**Fix Plan:**
1. **Restrict Provider Status Control:** In `dashboard/bookings/page.tsx`, remove `COMPLETED` from the provider's dropdown menu. Replace it with `AWAITING_CLIENT_CONFIRMATION` or a "Request Completion" action.
2. **Lock API Endpoints:** In `api/bookings/[id]/route.ts`, strictly block providers from passing `status: "COMPLETED"`. Ensure only the Client (or an Admin resolving a dispute) can trigger the final `COMPLETED` state that releases funds.

### 6.4 Dispute Filing (Missing UI)
**Identified Issues:**
* **Ghost Feature:** A highly detailed API route exists to handle disputes (`POST /api/bookings/[id]/dispute`)/dispute/route.ts], which correctly interacts with timelines and blocks escrow/escrow/milestones/route.ts]. However, **there is absolutely no UI in either the Client or Provider dashboard to trigger a dispute.** The dashboards only allow viewing, cancelling, or deleting.

**Fix Plan:**
1. **Add "Open Dispute" Button:** In `client/bookings/page.tsx` and `dashboard/bookings/page.tsx`, add a "File Dispute" button to the View Booking modal. This should only be visible for bookings that are `CONFIRMED` or `IN_PROGRESS` (as completed bookings cannot be disputed per the API)/dispute/route.ts].
2. **Dispute Modal:** Create a `DisputeModal.tsx` that includes a `textarea` for the user to explain the issue (validating that the reason is at least 20 characters, matching the Zod schema in the API)/dispute/route.ts].
3. **Status Banner:** If a booking is `DISPUTED`, show a warning banner in the booking details modal explaining that funds are frozen pending admin review.