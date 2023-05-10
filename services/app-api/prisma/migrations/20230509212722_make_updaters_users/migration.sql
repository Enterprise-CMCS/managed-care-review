/*
  Warnings:

  - You are about to drop the column `updateBy` on the `UpdateInfoTable` table. All the data in the column will be lost.
  - Added the required column `updateByID` to the `UpdateInfoTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UpdateInfoTable" DROP COLUMN "updateBy",
ADD COLUMN     "updateByID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "UpdateInfoTable" ADD CONSTRAINT "UpdateInfoTable_updateByID_fkey" FOREIGN KEY ("updateByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
