BEGIN;
-- DropForeignKey
ALTER TABLE "ContractActionTable" DROP CONSTRAINT "ContractActionTable_updatedByID_fkey";

-- AlterTable
ALTER TABLE "ContractActionTable" ALTER COLUMN "updatedByID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ContractActionTable" ADD CONSTRAINT "ContractActionTable_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
