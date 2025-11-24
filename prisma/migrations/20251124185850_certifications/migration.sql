-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "certifications" JSONB DEFAULT '[]',
ADD COLUMN     "education" JSONB DEFAULT '[]';
