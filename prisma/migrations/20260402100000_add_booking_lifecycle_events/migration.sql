-- Add booking-scoped lifecycle events so service-only bookings have timeline history.
CREATE TABLE IF NOT EXISTS "BookingLifecycleEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentId" TEXT,
  "eventType" TEXT NOT NULL,
  "fromState" TEXT,
  "toState" TEXT,
  "reason" TEXT,
  "actorUserId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "metadata" JSONB,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingLifecycleEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingLifecycleEvent_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BookingLifecycleEvent_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingLifecycleEvent_idempotencyKey_key"
  ON "BookingLifecycleEvent"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "BookingLifecycleEvent_bookingId_createdAt_idx"
  ON "BookingLifecycleEvent"("bookingId", "createdAt");

CREATE INDEX IF NOT EXISTS "BookingLifecycleEvent_paymentId_createdAt_idx"
  ON "BookingLifecycleEvent"("paymentId", "createdAt");

CREATE INDEX IF NOT EXISTS "BookingLifecycleEvent_eventType_createdAt_idx"
  ON "BookingLifecycleEvent"("eventType", "createdAt");
