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
