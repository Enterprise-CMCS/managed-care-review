BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable"
    ADD COLUMN "ilosRateDateStart" DATE,
    ADD COLUMN "ilosRateDateEnd" DATE;

COMMIT;
