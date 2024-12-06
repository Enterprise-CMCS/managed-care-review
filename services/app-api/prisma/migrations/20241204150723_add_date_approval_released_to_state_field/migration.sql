BEGIN;
ALTER TABLE "ContractActionTable" ADD COLUMN     "dateApprovalReleasedToState" TIMESTAMP(3);
COMMIT;