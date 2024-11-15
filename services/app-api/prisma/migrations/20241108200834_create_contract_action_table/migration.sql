BEGIN;

-- CreateEnum
CREATE TYPE "ContractActionType" AS ENUM ('UNDER_REVIEW', 'APPROVAL_NOTICE');

-- CreateTable
CREATE TABLE "ContractActionTable" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByID" TEXT NOT NULL,
    "updatedReason" TEXT NOT NULL,
    "actionType" "ContractActionType" NOT NULL,
    "contractID" TEXT NOT NULL,

    CONSTRAINT "ContractActionTable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractActionTable" ADD CONSTRAINT "ContractActionTable_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractActionTable" ADD CONSTRAINT "ContractActionTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
