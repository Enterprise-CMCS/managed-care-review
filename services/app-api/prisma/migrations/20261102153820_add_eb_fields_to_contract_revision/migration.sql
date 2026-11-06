BEGIN;
-- Alter table "ContractRevisionTable" to add Enrollment Broker (EB) submission fields
ALTER TABLE "ContractRevisionTable" 
ADD COLUMN     "ebAmendmentNumber" TEXT,
ADD COLUMN     "ebBaseContractInMCReview" BOOLEAN,
ADD COLUMN     "ebNewContractor" BOOLEAN,
ADD COLUMN     "ebPreviousAmendmentInMCReview" BOOLEAN,
ADD COLUMN     "ebStateContractIdentifier" TEXT;

COMMIT;
