-- Add persistent status history for provider job applications.
CREATE TABLE IF NOT EXISTS "ProposalStatusHistory" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "status" "ProposalStatus" NOT NULL,
  "reason" TEXT,
  "changedByUserId" TEXT,
  "changedByName" TEXT,
  "changedByRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProposalStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProposalStatusHistory_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProposalStatusHistory_proposalId_createdAt_idx"
  ON "ProposalStatusHistory"("proposalId", "createdAt");
