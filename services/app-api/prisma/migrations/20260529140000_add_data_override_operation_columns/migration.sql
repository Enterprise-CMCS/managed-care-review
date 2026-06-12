BEGIN;

-- CreateEnum
CREATE TYPE "ScalarFieldOverrideOperation" AS ENUM ('OVERRIDE', 'CLEAR_OVERRIDE');

-- CreateEnum
CREATE TYPE "ArrayFieldOverrideOperation" AS ENUM ('OVERRIDE', 'ADD', 'DELETE');

-- DropForeignKey
ALTER TABLE "RateDocumentOverride" DROP CONSTRAINT "RateDocumentOverride_documentID_fkey";

-- DropForeignKey
ALTER TABLE "RateSupportingDocumentOverride" DROP CONSTRAINT "RateSupportingDocumentOverride_documentID_fkey";

-- AlterTable
ALTER TABLE "ContractOverrides" ADD COLUMN "initiallySubmittedAtOp" "ScalarFieldOverrideOperation";

-- AlterTable
ALTER TABLE "ContractRevisionOverrides" ADD COLUMN "contractTypeOp" "ScalarFieldOverrideOperation";

-- AlterTable
ALTER TABLE "RateOverrides" ADD COLUMN "initiallySubmittedAtOp" "ScalarFieldOverrideOperation";

-- AlterTable
ALTER TABLE "RateDocumentOverride" ADD COLUMN "dateAddedOp" "ScalarFieldOverrideOperation",
ADD COLUMN "documentOp" "ArrayFieldOverrideOperation",
ADD COLUMN "documentSha256" TEXT,
ADD COLUMN "name" TEXT,
ADD COLUMN "s3BucketName" TEXT,
ADD COLUMN "s3Key" TEXT,
ADD COLUMN "s3URL" TEXT,
ADD COLUMN "sha256" TEXT,
ALTER COLUMN "documentID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RateSupportingDocumentOverride" ADD COLUMN "dateAddedOp" "ScalarFieldOverrideOperation",
ADD COLUMN "documentOp" "ArrayFieldOverrideOperation",
ADD COLUMN "documentSha256" TEXT,
ADD COLUMN "name" TEXT,
ADD COLUMN "s3BucketName" TEXT,
ADD COLUMN "s3Key" TEXT,
ADD COLUMN "s3URL" TEXT,
ADD COLUMN "sha256" TEXT,
ALTER COLUMN "documentID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ContractDocumentOverride" ADD COLUMN "dateAddedOp" "ScalarFieldOverrideOperation",
ADD COLUMN "documentOp" "ArrayFieldOverrideOperation",
ADD COLUMN "documentSha256" TEXT;

-- AlterTable
ALTER TABLE "ContractSupportingDocumentOverride" ADD COLUMN "dateAddedOp" "ScalarFieldOverrideOperation",
ADD COLUMN "documentOp" "ArrayFieldOverrideOperation",
ADD COLUMN "documentSha256" TEXT;

-- Existing parent-level scalar override backfill.
UPDATE "ContractOverrides"
SET "initiallySubmittedAtOp" = 'OVERRIDE'
WHERE "initiallySubmittedAt" IS NOT NULL;

UPDATE "RateOverrides"
SET "initiallySubmittedAtOp" = 'OVERRIDE'
WHERE "initiallySubmittedAt" IS NOT NULL;

-- Existing revision-level scalar override backfill.
UPDATE "ContractRevisionOverrides"
SET "contractTypeOp" = 'OVERRIDE'
WHERE "contractType" IS NOT NULL;

-- Existing document item operation backfill.
UPDATE "ContractDocumentOverride"
SET "documentOp" = CASE
    WHEN "documentID" IS NULL THEN 'ADD'::"ArrayFieldOverrideOperation"
    ELSE 'OVERRIDE'::"ArrayFieldOverrideOperation"
END;

UPDATE "ContractSupportingDocumentOverride"
SET "documentOp" = CASE
    WHEN "documentID" IS NULL THEN 'ADD'::"ArrayFieldOverrideOperation"
    ELSE 'OVERRIDE'::"ArrayFieldOverrideOperation"
END;

-- Current rate document overrides only target existing documents.
UPDATE "RateDocumentOverride"
SET "documentOp" = 'OVERRIDE'::"ArrayFieldOverrideOperation";

UPDATE "RateSupportingDocumentOverride"
SET "documentOp" = 'OVERRIDE'::"ArrayFieldOverrideOperation";

-- Existing-document documentSha256 backfill.
UPDATE "ContractDocumentOverride" cdo
SET "documentSha256" = cd."sha256"
FROM "ContractDocument" cd
WHERE cdo."documentID" = cd."id";

UPDATE "ContractSupportingDocumentOverride" csdo
SET "documentSha256" = csd."sha256"
FROM "ContractSupportingDocument" csd
WHERE csdo."documentID" = csd."id";

UPDATE "RateDocumentOverride" rdo
SET "documentSha256" = rd."sha256"
FROM "RateDocument" rd
WHERE rdo."documentID" = rd."id";

UPDATE "RateSupportingDocumentOverride" rsdo
SET "documentSha256" = rsd."sha256"
FROM "RateSupportingDocument" rsd
WHERE rsdo."documentID" = rsd."id";

-- Add-row documentSha256 backfill for existing contract document overrides.
-- Existing rate document overrides do not have add-mode rows today.
UPDATE "ContractDocumentOverride"
SET "documentSha256" = "sha256"
WHERE "documentID" IS NULL;

UPDATE "ContractSupportingDocumentOverride"
SET "documentSha256" = "sha256"
WHERE "documentID" IS NULL;

-- Dirty non-prod fallback: if a row cannot be backfilled from a base document
-- or add payload, keep the migration moving with an obvious repair marker.
-- Valid prod rows should not use these values.
UPDATE "ContractDocumentOverride"
SET "documentSha256" = 'REGENERATE_DOCUMENT_SHA256_' || "id"
WHERE "documentSha256" IS NULL;

UPDATE "ContractSupportingDocumentOverride"
SET "documentSha256" = 'REGENERATE_DOCUMENT_SHA256_' || "id"
WHERE "documentSha256" IS NULL;

UPDATE "RateDocumentOverride"
SET "documentSha256" = 'REGENERATE_DOCUMENT_SHA256_' || "id"
WHERE "documentSha256" IS NULL;

UPDATE "RateSupportingDocumentOverride"
SET "documentSha256" = 'REGENERATE_DOCUMENT_SHA256_' || "id"
WHERE "documentSha256" IS NULL;

-- documentOp and documentSha256 are required after existing rows are backfilled.
ALTER TABLE "ContractDocumentOverride"
ALTER COLUMN "documentOp" SET NOT NULL,
ALTER COLUMN "documentSha256" SET NOT NULL;

ALTER TABLE "ContractSupportingDocumentOverride"
ALTER COLUMN "documentOp" SET NOT NULL,
ALTER COLUMN "documentSha256" SET NOT NULL;

ALTER TABLE "RateDocumentOverride"
ALTER COLUMN "documentOp" SET NOT NULL,
ALTER COLUMN "documentSha256" SET NOT NULL;

ALTER TABLE "RateSupportingDocumentOverride"
ALTER COLUMN "documentOp" SET NOT NULL,
ALTER COLUMN "documentSha256" SET NOT NULL;

-- Existing document metadata scalar override backfill.
UPDATE "ContractDocumentOverride"
SET "dateAddedOp" = 'OVERRIDE'
WHERE "dateAdded" IS NOT NULL;

UPDATE "ContractSupportingDocumentOverride"
SET "dateAddedOp" = 'OVERRIDE'
WHERE "dateAdded" IS NOT NULL;

UPDATE "RateDocumentOverride"
SET "dateAddedOp" = 'OVERRIDE'
WHERE "dateAdded" IS NOT NULL;

UPDATE "RateSupportingDocumentOverride"
SET "dateAddedOp" = 'OVERRIDE'
WHERE "dateAdded" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "RateDocumentOverride" ADD CONSTRAINT "RateDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSupportingDocumentOverride" ADD CONSTRAINT "RateSupportingDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateSupportingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
