BEGIN;
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
CREATE TABLE "SDPTable" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mccrsID" TEXT,
    "stateCode" TEXT NOT NULL,
    "stateNumber" INTEGER NOT NULL,

    CONSTRAINT "SDPTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPRevisionTable" (
    "id" TEXT NOT NULL,
    "sdpID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SDPRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPQuestion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sdpID" TEXT NOT NULL,
    "addedByUserID" TEXT NOT NULL,
    "division" "Division" NOT NULL,

    CONSTRAINT "SDPQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPQuestionDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "s3BucketName" TEXT,
    "s3Key" TEXT,
    "questionID" TEXT NOT NULL,

    CONSTRAINT "SDPQuestionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPQuestionResponseDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "responseID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "s3BucketName" TEXT,
    "s3Key" TEXT,

    CONSTRAINT "SDPQuestionResponseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDPQuestionResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionID" TEXT NOT NULL,
    "addedByUserID" TEXT NOT NULL,

    CONSTRAINT "SDPQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SDPTable" ADD CONSTRAINT "SDPTable_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPRevisionTable" ADD CONSTRAINT "SDPRevisionTable_sdpID_fkey" FOREIGN KEY ("sdpID") REFERENCES "SDPTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestion" ADD CONSTRAINT "SDPQuestion_sdpID_fkey" FOREIGN KEY ("sdpID") REFERENCES "SDPTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestion" ADD CONSTRAINT "SDPQuestion_addedByUserID_fkey" FOREIGN KEY ("addedByUserID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestionDocument" ADD CONSTRAINT "SDPQuestionDocument_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "SDPQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestionResponseDocument" ADD CONSTRAINT "SDPQuestionResponseDocument_responseID_fkey" FOREIGN KEY ("responseID") REFERENCES "SDPQuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestionResponse" ADD CONSTRAINT "SDPQuestionResponse_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "SDPQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SDPQuestionResponse" ADD CONSTRAINT "SDPQuestionResponse_addedByUserID_fkey" FOREIGN KEY ("addedByUserID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;