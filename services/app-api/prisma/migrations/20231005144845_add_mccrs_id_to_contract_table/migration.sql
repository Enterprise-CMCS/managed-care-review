/*
  Warnings:

  - You are about to drop the column `mccrsID` on the `ContractRevisionTable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContractRevisionTable" DROP COLUMN "mccrsID";

-- AlterTable
ALTER TABLE "ContractTable" ADD COLUMN     "mccrsID" TEXT;
