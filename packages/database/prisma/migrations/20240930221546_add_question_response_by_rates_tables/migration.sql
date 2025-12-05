BEGIN;

-- CreateTable
CREATE TABLE "RateQuestion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rateID" TEXT NOT NULL,
    "addedByUserID" TEXT NOT NULL,
    "division" "Division" NOT NULL,

    CONSTRAINT "RateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionID" TEXT NOT NULL,
    "addedByUserID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "questionID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateQuestionResponseDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "responseID" TEXT NOT NULL,

    CONSTRAINT "RateQuestionResponseDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RateQuestion" ADD CONSTRAINT "RateQuestion_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestion" ADD CONSTRAINT "RateQuestion_addedByUserID_fkey" FOREIGN KEY ("addedByUserID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponse" ADD CONSTRAINT "RateQuestionResponse_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "RateQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponse" ADD CONSTRAINT "RateQuestionResponse_addedByUserID_fkey" FOREIGN KEY ("addedByUserID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionDocument" ADD CONSTRAINT "RateQuestionDocument_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "RateQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateQuestionResponseDocument" ADD CONSTRAINT "RateQuestionResponseDocument_responseID_fkey" FOREIGN KEY ("responseID") REFERENCES "RateQuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
