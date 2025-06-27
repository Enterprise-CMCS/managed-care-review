BEGIN;
/*
  Warnings:

  - The values [CONTRACT_SUPPORTING_DOCUMENTS,RATE_SUPPORTING_DOCUMENTS] on the enum `DocumentZipType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
CREATE TYPE "DocumentZipType_new" AS ENUM ('CONTRACT_DOCUMENTS', 'RATE_DOCUMENTS');
ALTER TABLE "DocumentZipPackage" ALTER COLUMN "documentType" TYPE "DocumentZipType_new" USING ("documentType"::text::"DocumentZipType_new");
ALTER TYPE "DocumentZipType" RENAME TO "DocumentZipType_old";
ALTER TYPE "DocumentZipType_new" RENAME TO "DocumentZipType";
DROP TYPE "DocumentZipType_old";

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "dsnpContract" BOOLEAN;
COMMIT;
