BEGIN;

-- DropForeignKey
ALTER TABLE "RateTable" DROP CONSTRAINT "RateTable_withdrawInfoID_fkey";

-- AlterTable
ALTER TABLE "RateTable" DROP COLUMN "withdrawInfoID";

COMMIT;
