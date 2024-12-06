BEGIN;

-- CreateEnum
CREATE TYPE "RateActionType" AS ENUM ('UNDER_REVIEW', 'WITHDRAW');

-- AlterTable
ALTER TABLE "ContractActionTable" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ContractQuestion" RENAME CONSTRAINT "Question_pkey" TO "ContractQuestion_pkey";

-- AlterTable
ALTER TABLE "ContractQuestionDocument" RENAME CONSTRAINT "QuestionDocument_pkey" TO "ContractQuestionDocument_pkey";

-- AlterTable
ALTER TABLE "ContractQuestionResponse" RENAME CONSTRAINT "QuestionResponse_pkey" TO "ContractQuestionResponse_pkey";

-- AlterTable
ALTER TABLE "ContractQuestionResponseDocument" RENAME CONSTRAINT "QuestionResponseDocument_pkey" TO "ContractQuestionResponseDocument_pkey";

-- CreateTable
CREATE TABLE "RateActionTable" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByID" TEXT NOT NULL,
    "updatedReason" TEXT NOT NULL,
    "actionType" "RateActionType" NOT NULL,
    "rateID" TEXT NOT NULL,

    CONSTRAINT "RateActionTable_pkey" PRIMARY KEY ("id")
);

-- RenameForeignKey
ALTER TABLE "ContractQuestion" RENAME CONSTRAINT "Question_addedByUserID_fkey" TO "ContractQuestion_addedByUserID_fkey";

-- RenameForeignKey
ALTER TABLE "ContractQuestionResponse" RENAME CONSTRAINT "QuestionResponse_addedByUserID_fkey" TO "ContractQuestionResponse_addedByUserID_fkey";

-- AddForeignKey
ALTER TABLE "RateActionTable" ADD CONSTRAINT "RateActionTable_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateActionTable" ADD CONSTRAINT "RateActionTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
