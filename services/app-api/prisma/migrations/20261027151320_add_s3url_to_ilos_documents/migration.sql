BEGIN;

/*
  Warnings:

  - Added the required column `s3URL` to the `ILOSDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3URL` to the `ILOSSupportingDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ILOSDocument" ADD COLUMN     "s3URL" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ILOSSupportingDocument" ADD COLUMN     "s3URL" TEXT NOT NULL;
COMMIT;
