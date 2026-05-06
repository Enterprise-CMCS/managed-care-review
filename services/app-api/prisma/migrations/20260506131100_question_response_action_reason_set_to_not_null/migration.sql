BEGIN;

-- AlterTable
ALTER TABLE "ContractQuestionAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContractQuestionDocumentAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContractQuestionResponseAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "ContractQuestionResponseDocumentAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateQuestionAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateQuestionDocumentAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateQuestionResponseAction" ALTER COLUMN "reason" SET NOT NULL;

-- AlterTable
ALTER TABLE "RateQuestionResponseDocumentAction" ALTER COLUMN "reason" SET NOT NULL;

COMMIT;
