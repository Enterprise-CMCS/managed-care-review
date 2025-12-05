BEGIN;

CREATE TYPE "ContractActionType_new" AS ENUM ('UNDER_REVIEW', 'MARK_AS_APPROVED');
ALTER TABLE "ContractActionTable" ALTER COLUMN "actionType" TYPE "ContractActionType_new" USING ("actionType"::text::"ContractActionType_new");
ALTER TYPE "ContractActionType" RENAME TO "ContractActionType_old";
ALTER TYPE "ContractActionType_new" RENAME TO "ContractActionType";
DROP TYPE "ContractActionType_old";

COMMIT;
