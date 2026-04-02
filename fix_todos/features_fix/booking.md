Based on the codebase audit, the Next.js component implementations, and the architectural gaps identified in the `service_flow.md` and `booking_flow_onboardingfix.md` documents, here is the comprehensive plan to fix the UI and data flows for the **Booking System (Section 6)**.

### 6.1 Booking Creation & Flow

**Identified Issues:**

- **Service Data Missing at Source:** The booking engine relies on `locationType`, `requiresAvailability`, and `defaultDuration` to calculate slots and costs. However, the provider service creation UI doesn't strictly enforce these, leading to broken downstream booking forms.
- **Auth State Hydration Gaps:** The localStorage bridge (`jit_booking_draft`) is implemented to preserve state when a guest redirects to login, but edge cases like applied promo codes or complex negotiation states might fail to rehydrate properly.
- **Slot Conflict Handling:** The API correctly throws a `409` and `"BOOKING_SLOT_CONFLICT"` when slots are double-booked, but the frontend needs to gracefully catch this exact error and highlight the calendar step, rather than failing silently or with a generic toast.

**Fix Plan:**

1.  **Enforce Service Booking Constraints:** Block booking creation at the `/api/bookings` layer if the associated service lacks a valid `defaultDuration` or `locationType`. Update the Provider Service Creation Wizard to make these fields mandatory.
2.  **Refine the Stepper UI:** The codebase currently shows 3 steps in `booking/page.tsx`, differing from the 4-step architecture requested in the `booking_flow_onboardingfix.md`. Separate "Review & Confirm" from the "Negotiate" flow to ensure clear UX.
3.  **Draft Hydration:** Expand `useBookingFormState` to serialize `promoCode`, `promoDiscount`, and `negotiationData` into the `localStorage` draft so users don't lose negotiations if forced to log in.
4.  **Conflict Resolution:** Catch the 409 conflict error in `handleSubmit` and automatically revert the user to Step 1 (`setCurrentStep(1)`) while clearing the conflicting `selectedTimeSlots`.

### 6.2 Booking Management

**Identified Issues:**

- **Anemic State Machine:** Bookings only track PENDING -\> CONFIRMED -\> COMPLETED. Real-world service fulfillment requires tracking when a provider is en route, when work starts, and when the client confirms it.
- **Provider-Only Completion:** Currently, providers can mark a booking as complete without client input, which undermines trust and escrow.
- **Job vs. Service Disparity:** Jobs have rich timeline events, while direct service bookings lack equivalent history tracking.

**Fix Plan:**

1.  **Unified Lifecycle Engine:** Expand `BOOKING_LIFECYCLE_EVENT_TYPES` to include `WORK_STARTED`, `PROVIDER_MARKED_COMPLETE`, and `CLIENT_CONFIRMED_COMPLETE`.
2.  **Implement Dual-Confirmation:** \* Modify the provider dashboard to update the status to `AWAITING_CLIENT_CONFIRMATION` instead of `COMPLETED`.
    - Create a new client-facing API endpoint (`/api/bookings/[id]/confirm-completion`) that officially transitions the status to `COMPLETED`, releases the escrow milestone, and triggers the review prompt.
3.  **PRO Limit API Bug:** Fix the hardcoded 5-service limit in `/api/provider/services/route.ts` to respect the `PRO` and `BUSINESS` tier flags, as advertised in the UI.

### 6.3 Booking Invoice

**Identified Issues:**

- **Next.js Server Component Crash:** In `src/app/bookings/[id]/invoice/page.tsx`, the page is exported as a Server Component, but the "Print / Save PDF" button has an `onClick={() => {}}` handler directly attached to it/invoice/page.tsx]. This will throw a runtime error because Server Components cannot contain client-side event handlers.

**Fix Plan:**

1.  **Extract Client Component:** Create a new file `src/components/invoices/PrintInvoiceButton.tsx` with `"use client"` at the top.
2.  **Implement Print Logic:** \`\`\`tsx
    "use client";
    export default function PrintInvoiceButton() {
    return (
    \<button onClick={() =\> window.print()} className="..."\>
    Print / Save PDF
    \</button\>
    );
    }
    ```

    ```
3.  **Refactor Invoice Page:** Import and mount `<PrintInvoiceButton />` inside the Server Component instead of using raw HTML buttons.

### 6.4 Dispute Filing

**Identified Issues:**

- **Dispute Event Mapping:** The `BOOKING_LIFECYCLE_EVENT_TYPES` includes `DISPUTE_OPENED`, but there is no mechanism to freeze the escrow payout when this occurs.

**Fix Plan:**

1.  **Dispute API Guard:** When `/api/bookings/[id]/dispute` is called, it must simultaneously write the `DISPUTE_OPENED` lifecycle event AND update the booking `status` to `DISPUTED`.
2.  **Escrow Freeze:** Update `/api/bookings/[id]/escrow/milestones` to block any milestone releases if the booking status is `DISPUTED`.
3.  **Admin Routing:** Ensure the creation of a `Dispute` record triggers a push event to the `/admin/disputes` dashboard to alert the support team immediately.

### Execution Priority

1.  **High/Immediate:** Fix the React Server Component bug in the Invoice page to prevent production crashes.
2.  **High:** Enforce service prerequisite fields (`locationType`, `defaultDuration`) on the provider side so the booking flow works predictably.
3.  **Medium:** Overhaul the booking state machine to require Client Confirmation before finalizing a booking and releasing funds.
4.  **Medium:** Polish the UI step hydration and catch 409 double-booking slot conflicts smoothly.
