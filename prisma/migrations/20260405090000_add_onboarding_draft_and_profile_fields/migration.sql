-- Add resumable onboarding draft storage and explicit provider onboarding fields.
ALTER TABLE "User"
ADD COLUMN "onboardingDraft" JSONB;

ALTER TABLE "Profile"
ADD COLUMN "businessName" TEXT,
ADD COLUMN "primaryCategoryId" TEXT;
