BEGIN;

DO $$
BEGIN
    CREATE TYPE "SDPSubmissionType" AS ENUM (
        'NEW_STATE_DIRECTED_PAYMENT_PREPRINT',
        'AMENDMENT_TO_AN_APPROVED_PREPRINT',
        'RENEWAL_FOR_NEW_RATING_PERIOD'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "SDPChangeType" AS ENUM (
        'RATING_PERIOD',
        'PAYMENT_TYPE',
        'PROVIDER_TYPE',
        'QUALITY_METRICS_OR_BENCHMARKS',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ContractSubmissionType" ADD VALUE IF NOT EXISTS 'SDP';

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "submissionType" "SDPSubmissionType";

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "programIDs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "changesIncluded" "SDPChangeType"[] NOT NULL DEFAULT ARRAY[]::"SDPChangeType"[];

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "ratingPeriodStart" TIMESTAMP(3);

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "ratingPeriodEnd" TIMESTAMP(3);

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "estimatedFederalShare" TEXT;

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "estimatedStateShare" TEXT;

ALTER TABLE "SDPRevisionTable"
    ADD COLUMN IF NOT EXISTS "automaticallyRenewed" BOOLEAN;

COMMIT;
