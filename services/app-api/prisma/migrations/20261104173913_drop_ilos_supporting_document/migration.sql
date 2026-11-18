BEGIN;

/*
  Warnings:

  - You are about to drop the `ILOSSupportingDocument` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ILOSSupportingDocument" DROP CONSTRAINT "ILOSSupportingDocument_contractRevisionID_fkey";

-- DropTable
DROP TABLE "ILOSSupportingDocument";

COMMIT;
