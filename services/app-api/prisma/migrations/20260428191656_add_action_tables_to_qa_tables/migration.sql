BEGIN;
-- CreateEnum
CREATE TYPE "QuestionActionType" AS ENUM ('DELETE', 'RESTORE', 'CASCADE_DELETE', 'CASCADE_RESTORE');

-- AlterTable
ALTER TABLE "_ContractRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_ContractRevisionTableToUpdateInfoTable_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ContractRevisionTableToUpdateInfoTable_AB_unique";

-- AlterTable
ALTER TABLE "_RateRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_RateRevisionTableToUpdateInfoTable_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_RateRevisionTableToUpdateInfoTable_AB_unique";

-- AlterTable
ALTER TABLE "_SharedRateRevisions" ADD CONSTRAINT "_SharedRateRevisions_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SharedRateRevisions_AB_unique";

-- AlterTable
ALTER TABLE "_StateToAssignedCMSUser" ADD CONSTRAINT "_StateToAssignedCMSUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_StateToAssignedCMSUser_AB_unique";

-- CreateTable
CREATE TABLE "ContractQuestionAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "questionID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "ContractQuestionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractQuestionDocumentAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "documentID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "ContractQuestionDocumentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractQuestionResponseDocumentAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "documentID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "ContractQuestionResponseDocumentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractQuestionResponseAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "responseID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "ContractQuestionResponseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "questionID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionResponseAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "responseID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionResponseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionDocumentAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "documentID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionDocumentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionResponseDocumentAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "QuestionActionType" NOT NULL,
    "reason" TEXT,
    "documentID" TEXT NOT NULL,
    "updatedByID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionResponseDocumentAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractQuestionAction_questionID_createdAt_idx" ON "ContractQuestionAction"("questionID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractQuestionDocumentAction_documentID_createdAt_idx" ON "ContractQuestionDocumentAction"("documentID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractQuestionResponseDocumentAction_documentID_createdAt_idx" ON "ContractQuestionResponseDocumentAction"("documentID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContractQuestionResponseAction_responseID_createdAt_idx" ON "ContractQuestionResponseAction"("responseID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RateQuestionAction_questionID_createdAt_idx" ON "RateQuestionAction"("questionID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RateQuestionResponseAction_responseID_createdAt_idx" ON "RateQuestionResponseAction"("responseID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RateQuestionDocumentAction_documentID_createdAt_idx" ON "RateQuestionDocumentAction"("documentID", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RateQuestionResponseDocumentAction_documentID_createdAt_idx" ON "RateQuestionResponseDocumentAction"("documentID", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ContractQuestionAction" ADD CONSTRAINT "ContractQuestionAction_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "ContractQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionAction" ADD CONSTRAINT "ContractQuestionAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionDocumentAction" ADD CONSTRAINT "ContractQuestionDocumentAction_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "ContractQuestionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionDocumentAction" ADD CONSTRAINT "ContractQuestionDocumentAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionResponseDocumentAction" ADD CONSTRAINT "ContractQuestionResponseDocumentAction_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "ContractQuestionResponseDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionResponseDocumentAction" ADD CONSTRAINT "ContractQuestionResponseDocumentAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionResponseAction" ADD CONSTRAINT "ContractQuestionResponseAction_responseID_fkey" FOREIGN KEY ("responseID") REFERENCES "ContractQuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractQuestionResponseAction" ADD CONSTRAINT "ContractQuestionResponseAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionAction" ADD CONSTRAINT "RateQuestionAction_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "RateQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionAction" ADD CONSTRAINT "RateQuestionAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponseAction" ADD CONSTRAINT "RateQuestionResponseAction_responseID_fkey" FOREIGN KEY ("responseID") REFERENCES "RateQuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponseAction" ADD CONSTRAINT "RateQuestionResponseAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionDocumentAction" ADD CONSTRAINT "RateQuestionDocumentAction_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateQuestionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionDocumentAction" ADD CONSTRAINT "RateQuestionDocumentAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponseDocumentAction" ADD CONSTRAINT "RateQuestionResponseDocumentAction_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateQuestionResponseDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponseDocumentAction" ADD CONSTRAINT "RateQuestionResponseDocumentAction_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
