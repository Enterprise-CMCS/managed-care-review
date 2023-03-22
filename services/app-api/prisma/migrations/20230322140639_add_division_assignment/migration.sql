-- CreateEnum
CREATE TYPE "Division" AS ENUM ('DMCO', 'DMCP', 'OACT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "divisionAssignment" "Division";
