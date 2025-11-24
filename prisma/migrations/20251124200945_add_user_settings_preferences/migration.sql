-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationPreferences" JSONB DEFAULT '{"emailJobAlerts":true,"emailMessages":true,"emailBookings":true,"emailReviews":true,"emailMarketing":false,"pushNotifications":true}',
ADD COLUMN     "privacySettings" JSONB DEFAULT '{"profileVisible":true,"searchable":true,"showLocation":true,"allowMessages":true}';
