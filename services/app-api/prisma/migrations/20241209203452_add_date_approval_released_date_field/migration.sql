BEGIN;
ALTER TABLE "ContractActionTable" ADD COLUMN     "dateApprovalReleasedToState" DATE;
COMMIT;