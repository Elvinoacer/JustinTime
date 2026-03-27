import { calculateRefund } from "../src/lib/cancellation";

async function main() {
  console.log("--- Verifying Cancellation Policy Engine ---");

  // Test Logic Directly
  const totalAmount = 1000;
  const now = new Date();

  // Future date (Tomorrow)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1); // +24h
  // Add 1 hour to ensure > 24 hours
  tomorrow.setHours(tomorrow.getHours() + 1);

  // 1. FLEXIBLE: > 24h = 100% Refund
  const flexResult = calculateRefund(totalAmount, tomorrow, "FLEXIBLE", now);
  console.log(
    `FLEXIBLE > 24h: Refund ${flexResult.refundPercentage}% (Expected 100) -> ${flexResult.refundPercentage === 100 ? "PASS" : "FAIL"}`,
  );

  // 2. STRICT: < 48h (since tomorrow is only ~25h away) = 0% Refund
  // Wait, Strict is 50% if > 48h. Since 25h is < 48h, user gets 0 refund.
  const strictResult = calculateRefund(totalAmount, tomorrow, "STRICT", now);
  console.log(
    `STRICT < 48h: Refund ${strictResult.refundPercentage}% (Expected 0) -> ${strictResult.refundPercentage === 0 ? "PASS" : "FAIL"}`,
  );

  // 3. MODERATE: > 12h but < 48h = 50% Refund
  const modResult = calculateRefund(totalAmount, tomorrow, "MODERATE", now);
  console.log(
    `MODERATE (25h left): Refund ${modResult.refundPercentage}% (Expected 50) -> ${modResult.refundPercentage === 50 ? "PASS" : "FAIL"}`,
  );

  // 4. Short Notice Test (<4h)
  const soon = new Date(now);
  soon.setHours(now.getHours() + 2); // 2 hours away

  const flexSoon = calculateRefund(totalAmount, soon, "FLEXIBLE", now);
  console.log(
    `FLEXIBLE < 4h: Refund ${flexSoon.refundPercentage}% (Expected 0) -> ${flexSoon.refundPercentage === 0 ? "PASS" : "FAIL"}`,
  );

  console.log("--- Logic Verification Complete ---");
}

main().catch((e) => console.error(e));
