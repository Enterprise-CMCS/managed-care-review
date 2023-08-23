BEGIN;
/*
  Warnings:

  - Made the column `sha256` on table `ContractDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sha256` on table `ContractSupportingDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sha256` on table `RateDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sha256` on table `RateSupportingDocument` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ContractDocument" ALTER COLUMN "sha256" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContractSupportingDocument" ALTER COLUMN "sha256" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateDocument" ALTER COLUMN "sha256" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateSupportingDocument" ALTER COLUMN "sha256" SET NOT NULL;
COMMIT;