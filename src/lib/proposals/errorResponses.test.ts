import test from "node:test";
import assert from "node:assert/strict";
import { toSubmitProposalErrorResponse } from "./errorResponses";

test("maps self-application error to 409", async () => {
  const response = toSubmitProposalErrorResponse(
    new Error("CANNOT_APPLY_TO_OWN_JOB"),
  );

  assert.ok(response);
  assert.equal(response.status, 409);
  assert.equal(await response.text(), "You cannot apply to your own job");
});

test("maps duplicate proposal to 409", async () => {
  const response = toSubmitProposalErrorResponse(
    new Error("PROPOSAL_ALREADY_EXISTS"),
  );

  assert.ok(response);
  assert.equal(response.status, 409);
  assert.equal(
    await response.text(),
    "You have already submitted a proposal for this job",
  );
});

test("returns null for unknown errors", () => {
  const response = toSubmitProposalErrorResponse(new Error("UNKNOWN"));
  assert.equal(response, null);
});
