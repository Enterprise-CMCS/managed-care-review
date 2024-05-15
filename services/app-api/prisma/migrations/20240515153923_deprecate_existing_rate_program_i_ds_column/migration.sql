BEGIN;
ALTER TABLE "RateRevisionTable"
RENAME COLUMN "rateProgramIDs" to "deprecatedRateProgramIDs";
ALTER TABLE "RateRevisionTable"
ADD COLUMN "rateProgramIDs" TEXT[];
COMMIT;