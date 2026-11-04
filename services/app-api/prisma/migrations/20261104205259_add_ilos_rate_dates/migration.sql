BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "ilosRateDateEnd" DATE,
ADD COLUMN     "ilosRateDateStart" DATE;

COMMIT;
