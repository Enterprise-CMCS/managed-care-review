/*
  Warnings:

  - You are about to drop the column `euaID` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_euaID_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "euaID";
