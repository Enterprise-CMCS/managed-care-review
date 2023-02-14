-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "pkgID" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "addedByUserID" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionID" TEXT NOT NULL,

    CONSTRAINT "QuestionDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_pkgID_fkey" FOREIGN KEY ("pkgID") REFERENCES "HealthPlanPackageTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_addedByUserID_fkey" FOREIGN KEY ("addedByUserID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionDocument" ADD CONSTRAINT "QuestionDocument_questionID_fkey" FOREIGN KEY ("questionID") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
