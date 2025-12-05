BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "eqroNewContractor" BOOLEAN,
ADD COLUMN     "eqroProvisionChipEqrRelatedActivities" BOOLEAN,
ADD COLUMN     "eqroProvisionMcoEqrOrRelatedActivities" BOOLEAN,
ADD COLUMN     "eqroProvisionMcoNewOptionalActivity" BOOLEAN,
ADD COLUMN     "eqroProvisionNewMcoEqrRelatedActivities" BOOLEAN;

COMMIT;
