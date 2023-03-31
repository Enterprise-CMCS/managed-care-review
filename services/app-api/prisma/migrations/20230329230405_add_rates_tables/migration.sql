-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('CONTRACT_ONLY', 'CONTRACT_AND_RATES');

-- CreateEnum
CREATE TYPE "FederalAuthority" AS ENUM ('STATE_PLAN', 'WAIVER_1915B', 'WAIVER_1115', 'VOLUNTARY', 'BENCHMARK', 'TITLE_XXI');

-- CreateTable
CREATE TABLE "ContractTable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "ContractTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateTable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "RateTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRevisionTable" (
    "id" TEXT NOT NULL,
    "contractID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "contractDescription" TEXT,

    CONSTRAINT "ContractRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftContractFormDataTable" (
    "id" TEXT NOT NULL,
    "contractDescription" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "submissionType" "SubmissionType",
    "federalAuthorities" "FederalAuthority"[],

    CONSTRAINT "DraftContractFormDataTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRevisionTable" (
    "id" TEXT NOT NULL,
    "rateID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "rateCertURL" TEXT,

    CONSTRAINT "RateRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRevisionsOnContractRevisionsTable" (
    "rateRevisionID" TEXT NOT NULL,
    "contractRevisionID" TEXT NOT NULL,
    "validAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateRevisionsOnContractRevisionsTable_pkey" PRIMARY KEY ("rateRevisionID","contractRevisionID","validAfter")
);

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
