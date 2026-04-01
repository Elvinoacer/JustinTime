-- Add configurable accepted-provider capacity per job.
ALTER TABLE "Job"
ADD COLUMN "maxAcceptedProviders" INTEGER;
