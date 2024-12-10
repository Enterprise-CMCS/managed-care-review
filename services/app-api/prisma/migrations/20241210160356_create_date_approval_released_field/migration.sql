BEGIN;
ALTER TABLE "ContractActionTable" ADD COLUMN     "dateApprovalReleasedToState" DATE,
ALTER COLUMN "updatedReason" DROP NOT NULL;
COMMIT;