BEGIN;
/*
  Warnings:

  - Made the column `sha256` on table `DocumentZipPackage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DocumentZipPackage" ALTER COLUMN "sha256" SET NOT NULL;
COMMIT;
