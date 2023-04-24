BEGIN;
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "division" "Division";
-- UpdateTable
UPDATE "Question" SET "division" = COALESCE("User"."divisionAssignment", 'DMCO') FROM "User" WHERE "Question"."addedByUserID" = "User"."id";
-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "division" SET NOT NULL;
COMMIT;
