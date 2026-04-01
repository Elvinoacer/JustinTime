-- Enforce one proposal per provider per job and clean up any pre-existing duplicates.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "jobId", "providerId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS row_num
  FROM "Proposal"
)
DELETE FROM "Proposal" p
USING ranked r
WHERE p.id = r.id
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_jobId_providerId_key"
ON "Proposal"("jobId", "providerId");
