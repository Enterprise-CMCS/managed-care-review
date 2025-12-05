BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "statutoryRegulatoryAttestation" BOOLEAN;

COMMIT;
