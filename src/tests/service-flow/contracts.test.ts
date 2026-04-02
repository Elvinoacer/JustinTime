import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceFile } from "../jobs-ui/workspaceFile";

test("service limit contract is shared in services config", () => {
  const content = readWorkspaceFile("src/lib/services/config.ts");

  assert.match(content, /SERVICE_LIMITS_BY_PLAN/);
  assert.match(content, /FREE:\s*5/);
  assert.match(content, /PRO:\s*Number\.POSITIVE_INFINITY/);
  assert.match(content, /BUSINESS:\s*Number\.POSITIVE_INFINITY/);
  assert.match(content, /export function getServiceLimitForPlan/);
});

test("provider services API enforces plan-aware service limits", () => {
  const content = readWorkspaceFile("src/app/api/provider/services/route.ts");

  assert.match(content, /getServiceLimitForPlan/);
  assert.match(content, /resolveEffectiveServicePlan/);
  assert.match(content, /Number\.isFinite\(serviceLimit\)/);
  assert.match(content, /maximum limit of \$\{serviceLimit\} services/);
  assert.doesNotMatch(content, /serviceCount >= 5/);
});

test("provider services API includes operational service config fields", () => {
  const content = readWorkspaceFile("src/app/api/provider/services/route.ts");

  assert.match(content, /requiresAvailability/);
  assert.match(content, /defaultDuration/);
  assert.match(content, /locationType/);
  assert.match(
    content,
    /location:\s*validatedData\.location\?\.trim\(\) \|\| null/,
  );
  assert.match(content, /cancellationPolicy/);
});

test("service form captures booking configuration in step 2", () => {
  const content = readWorkspaceFile(
    "src/components/dashboard/services/ServiceFormModal.tsx",
  );

  assert.match(content, /requiresAvailability:\s*z\.boolean\(\)/);
  assert.match(content, /defaultDuration:/);
  assert.match(content, /locationType:\s*z\.enum\(SERVICE_LOCATION_TYPES\)/);
  assert.match(
    content,
    /cancellationPolicy:\s*z\.enum\(SERVICE_CANCELLATION_POLICIES\)/,
  );
  assert.match(content, /Requires Availability Schedule/);
  assert.match(content, /Service Delivery Type/);
  assert.match(content, /Cancellation Policy/);
});

test("services dashboard uses readiness checklist for onboarding handoff", () => {
  const content = readWorkspaceFile("src/app/dashboard/services/page.tsx");

  assert.match(content, /apiClient\.get\("\/provider\/availability"\)/);
  assert.match(content, /onboardingChecklist/);
  assert.match(content, /Complete your provider readiness checklist/);
  assert.match(content, /getServiceLimitForPlan\(currentPlan\)/);
});

test("schema defines booking lifecycle event model for service and job bookings", () => {
  const content = readWorkspaceFile("prisma/schema.prisma");

  assert.match(content, /model BookingLifecycleEvent/);
  assert.match(content, /bookingId\s+String/);
  assert.match(content, /eventType\s+String/);
  assert.match(content, /bookingLifecycleEvents BookingLifecycleEvent\[\]/);
});

test("booking lifecycle helper supports idempotent event writes", () => {
  const content = readWorkspaceFile("src/lib/bookings/lifecycleTimeline.ts");

  assert.match(content, /BOOKING_LIFECYCLE_EVENT_TYPES/);
  assert.match(content, /BOOKING_CREATED/);
  assert.match(content, /BOOKING_STATUS_CHANGED/);
  assert.match(content, /PAYMENT_STATUS_CHANGED/);
  assert.match(content, /recordBookingLifecycleEvent/);
  assert.match(content, /bookingLifecycleEvent\.create/);
  assert.match(content, /P2002/);
});

test("booking create route records BOOKING_CREATED lifecycle events", () => {
  const content = readWorkspaceFile("src/app/api/bookings/route.ts");

  assert.match(content, /recordBookingLifecycleEvent\(\{/);
  assert.match(
    content,
    /eventType:\s*BOOKING_LIFECYCLE_EVENT_TYPES\.BOOKING_CREATED/,
  );
  assert.match(
    content,
    /idempotencyKey:\s*`booking:\$\{booking\.id\}:created`/,
  );
});

test("booking update route records booking and payment lifecycle events", () => {
  const content = readWorkspaceFile("src/app/api/bookings/[id]/route.ts");

  assert.match(
    content,
    /eventType:\s*BOOKING_LIFECYCLE_EVENT_TYPES\.BOOKING_STATUS_CHANGED/,
  );
  assert.match(
    content,
    /eventType:\s*BOOKING_LIFECYCLE_EVENT_TYPES\.PAYMENT_STATUS_CHANGED/,
  );
  assert.match(content, /recordBookingLifecycleEvent\(\{/);
  assert.match(content, /if \(booking\.jobId\)/);
});

test("cancellation action requires reason and records refund transactions", () => {
  const content = readWorkspaceFile("src/app/actions/cancellation.ts");

  assert.match(content, /normalizedReason\.length < 5/);
  assert.match(content, /calculateRefund/);
  assert.match(content, /status: "CANCELLED"/);
  assert.match(content, /status: "REFUNDED"/);
  assert.match(content, /type: "REFUND"/);
  assert.match(content, /recordBookingLifecycleEvent/);
});

test("escrow milestones route requires verified payments and no synthetic upsert", () => {
  const content = readWorkspaceFile(
    "src/app/api/bookings/[id]/escrow/milestones/route.ts",
  );

  assert.match(
    content,
    /Cannot configure milestones before payment is recorded/,
  );
  assert.match(
    content,
    /Cannot configure milestones until a confirmed payment reference exists/,
  );
  assert.match(
    content,
    /Cannot configure milestones until payment is confirmed by the gateway/,
  );
  assert.match(content, /tx\.payment\.update\(/);
  assert.doesNotMatch(content, /tx\.payment\.upsert\(/);
});

test("booking timeline API route reads bookingLifecycleEvent records", () => {
  const content = readWorkspaceFile(
    "src/app/api/bookings/[id]/timeline/route.ts",
  );

  assert.match(content, /prisma\.bookingLifecycleEvent\.findMany/);
  assert.match(content, /prisma\.bookingLifecycleEvent\.count/);
  assert.match(content, /BOOKING_TIMELINE_GET/);
  assert.match(content, /booking\.clientId === session\.user\.id/);
  assert.match(content, /booking\.providerId === session\.user\.id/);
});

test("accept reject and dispute routes write booking lifecycle events", () => {
  const acceptContent = readWorkspaceFile(
    "src/app/api/bookings/[id]/accept/route.ts",
  );
  const rejectContent = readWorkspaceFile(
    "src/app/api/bookings/[id]/reject/route.ts",
  );
  const disputeContent = readWorkspaceFile(
    "src/app/api/bookings/[id]/dispute/route.ts",
  );

  assert.match(acceptContent, /recordBookingLifecycleEvent/);
  assert.match(rejectContent, /recordBookingLifecycleEvent/);
  assert.match(disputeContent, /BOOKING_LIFECYCLE_EVENT_TYPES\.DISPUTE_OPENED/);
});

test("booking status enum supports awaiting client confirmation", () => {
  const content = readWorkspaceFile("prisma/schema.prisma");

  assert.match(content, /enum BookingStatus/);
  assert.match(content, /AWAITING_CLIENT_CONFIRMATION/);
});

test("provider completion transitions to awaiting client confirmation", () => {
  const content = readWorkspaceFile("src/app/api/bookings/[id]/route.ts");

  assert.match(content, /providerMarkedComplete/);
  assert.match(content, /status = "AWAITING_CLIENT_CONFIRMATION"/);
  assert.match(
    content,
    /BOOKING_LIFECYCLE_EVENT_TYPES\.PROVIDER_MARKED_COMPLETE/,
  );
});

test("client completion confirmation route finalizes booking and lifecycle", () => {
  const content = readWorkspaceFile(
    "src/app/api/bookings/[id]/confirm-completion/route.ts",
  );

  assert.match(content, /booking\.status !== "AWAITING_CLIENT_CONFIRMATION"/);
  assert.match(
    content,
    /BOOKING_LIFECYCLE_EVENT_TYPES\.CLIENT_CONFIRMED_COMPLETE/,
  );
  assert.match(content, /status: "COMPLETED"/);
});

test("client and provider booking pages require reasoned cancellation and dispute modal", () => {
  const clientContent = readWorkspaceFile("src/app/client/bookings/page.tsx");
  const providerContent = readWorkspaceFile(
    "src/app/dashboard/bookings/page.tsx",
  );

  assert.match(clientContent, /import DisputeModal from/);
  assert.match(clientContent, /Cancellation reason/);
  assert.match(clientContent, /cancelBooking\(/);
  assert.match(clientContent, /This booking is currently disputed/);

  assert.match(providerContent, /import DisputeModal from/);
  assert.match(providerContent, /Cancellation reason/);
  assert.match(providerContent, /cancelBooking\(/);
  assert.match(providerContent, /This booking is in dispute/);
});

test("booking draft state persists promo and negotiation metadata", () => {
  const content = readWorkspaceFile(
    "src/app/booking/hooks/useBookingFormState.ts",
  );

  assert.match(content, /const STORAGE_KEY = "jit_booking_draft"/);
  assert.match(content, /promoDiscount/);
  assert.match(content, /negotiationData/);
  assert.match(content, /appliedPromo/);
});

test("booking page exposes separate negotiation step", () => {
  const content = readWorkspaceFile("src/app/booking/page.tsx");

  assert.match(content, /title: "Negotiate \(optional\)"/);
  assert.match(content, /currentStep === 4/);
});

test("invoice page delegates printing to client component", () => {
  const invoiceContent = readWorkspaceFile(
    "src/app/bookings/[id]/invoice/page.tsx",
  );
  const printButtonContent = readWorkspaceFile(
    "src/components/invoices/PrintInvoiceButton.tsx",
  );

  assert.match(invoiceContent, /PrintInvoiceButton/);
  assert.doesNotMatch(invoiceContent, /onClick=\{\(\) => \{\}\}/);
  assert.match(printButtonContent, /"use client"/);
  assert.match(printButtonContent, /window\.print\(\)/);
});

test("messaging send route blocks users and broadcasts persisted messages", () => {
  const content = readWorkspaceFile("src/app/api/messages/send/route.ts");

  assert.match(content, /isBlockedBetweenUsers/);
  assert.match(content, /broadcastRealtimeEvent/);
  assert.match(content, /event:\s*"new_message"/);
  assert.match(content, /clientTempId/);
  assert.match(content, /partnerId/);
  assert.match(content, /partnerName/);
});

test("message history and receipts persist and fan out read-delivery state", () => {
  const historyContent = readWorkspaceFile(
    "src/app/api/messages/history/[otherUserId]/route.ts",
  );
  const readContent = readWorkspaceFile("src/app/api/messages/read/route.ts");
  const deliveredContent = readWorkspaceFile(
    "src/app/api/messages/delivered/route.ts",
  );

  assert.match(historyContent, /isBlockedBetweenUsers/);
  assert.match(historyContent, /event:\s*"messages_read"/);
  assert.match(readContent, /event:\s*"messages_read"/);
  assert.match(deliveredContent, /event:\s*"message_delivered"/);
});

test("communication UI and webhook include typing, heartbeat, and async webhook processing", () => {
  const chatWindowContent = readWorkspaceFile(
    "src/components/client/messages/ChatWindow.tsx",
  );
  const callOverlayContent = readWorkspaceFile(
    "src/components/communication/CallOverlay.tsx",
  );
  const whatsappWebhookContent = readWorkspaceFile(
    "src/app/api/webhooks/whatsapp/route.ts",
  );

  assert.match(chatWindowContent, /onTypingStart/);
  assert.match(chatWindowContent, /onTypingStop/);
  assert.match(chatWindowContent, /In-App Audio/);
  assert.match(callOverlayContent, /\/api\/calls\/heartbeat/);
  assert.match(callOverlayContent, /sendBeacon/);
  assert.match(whatsappWebhookContent, /normalizeIncomingMessages/);
  assert.match(whatsappWebhookContent, /after\(async \(\) =>/);
});

test("clear conversation is per-user state and no longer destructive", () => {
  const schemaContent = readWorkspaceFile("prisma/schema.prisma");
  const clearRouteContent = readWorkspaceFile(
    "src/app/api/messages/clear/[otherUserId]/route.ts",
  );
  const conversationRouteContent = readWorkspaceFile(
    "src/app/api/messages/conversations/route.ts",
  );
  const historyRouteContent = readWorkspaceFile(
    "src/app/api/messages/history/[otherUserId]/route.ts",
  );

  assert.match(schemaContent, /model MessageConversationState/);
  assert.match(clearRouteContent, /messageConversationState\.upsert/);
  assert.match(clearRouteContent, /event:\s*"conversation_cleared"/);
  assert.doesNotMatch(clearRouteContent, /message\.deleteMany/);
  assert.doesNotMatch(clearRouteContent, /deleteFile/);
  assert.match(conversationRouteContent, /getConversationClearCutoffs/);
  assert.match(historyRouteContent, /getConversationClearCutoff/);
});
