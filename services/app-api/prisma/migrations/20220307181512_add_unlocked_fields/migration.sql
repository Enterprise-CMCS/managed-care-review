-- AlterTable
ALTER TABLE "StateSubmissionRevision" ADD COLUMN     "unlockedAt" TIMESTAMP(3),
ADD COLUMN     "unlockedBy" TEXT,
ADD COLUMN     "unlockedReason" TEXT;
