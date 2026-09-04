BEGIN;
-- AlterTable
ALTER TABLE "ContractRevisionOverrides" ADD COLUMN     "dsnpContract" BOOLEAN,
ADD COLUMN     "dsnpContractOp" "ScalarFieldOverrideOperation";

-- AlterTable
ALTER TABLE "RateRevisionOverrides" ADD COLUMN     "rateMedicaidPopulations" "RateMedicaidPopulations"[] DEFAULT ARRAY[]::"RateMedicaidPopulations"[],
ADD COLUMN     "rateMedicaidPopulationsOp" "ScalarFieldOverrideOperation";

COMMIT;
