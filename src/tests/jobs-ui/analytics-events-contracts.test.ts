import test from "node:test";
import assert from "node:assert/strict";
import {
  JOBS_EVENT_NAMES,
  jobsEventSchema,
} from "../../lib/analytics/jobs-events-schema";

test("jobs analytics schema includes recommendation event names", () => {
  assert.ok(JOBS_EVENT_NAMES.includes("proposal_recommendation_impression"));
  assert.ok(JOBS_EVENT_NAMES.includes("proposal_recommendation_clicked"));
});

test("jobs analytics schema accepts recommendation payload fields", () => {
  const parsed = jobsEventSchema.safeParse({
    event: "proposal_recommendation_clicked",
    recommendationLabel: "Top Match",
    isRecommended: true,
    sourcePage: "job-details",
    timestamp: Date.now(),
  });

  assert.equal(parsed.success, true);
});
