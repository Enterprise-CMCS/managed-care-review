BEGIN;
/*
  Warnings:

  - You are about to drop the column `name` on the `ContractRevisionTable` table. All the data in the column will be lost.
  - Added the required column `submissionType` to the `ContractRevisionTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateCode` to the `ContractTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateNumber` to the `ContractTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateCode` to the `RateTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stateNumber` to the `RateTable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('NEW', 'AMENDMENT');

-- CreateEnum
CREATE TYPE "RateCapitationType" AS ENUM ('RATE_CELL', 'RATE_RANGE');

-- CreateEnum
CREATE TYPE "ManagedCareEntity" AS ENUM ('MCO', 'PIHP', 'PAHP', 'PCCM');

-- CreateEnum
CREATE TYPE "FederalAuthority" AS ENUM ('STATE_PLAN', 'WAIVER_1915B', 'WAIVER_1115', 'VOLUNTARY', 'BENCHMARK', 'TITLE_XXI');

-- CreateEnum
CREATE TYPE "ContractExecutionStatus" AS ENUM ('EXECUTED', 'UNEXECUTED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('BASE', 'AMENDMENT');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CONTRACT', 'RATES', 'CONTRACT_RELATED', 'RATES_RELATED');

-- CreateEnum
CREATE TYPE "ActuaryCommunication" AS ENUM ('OACT_TO_ACTUARY', 'OACT_TO_STATE');

-- CreateEnum
CREATE TYPE "ActuarialFirm" AS ENUM ('MERCER', 'MILLIMAN', 'OPTUMAS', 'GUIDEHOUSE', 'DELOITTE', 'STATE_IN_HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "PopulationCoverageType" AS ENUM ('MEDICAID', 'CHIP', 'MEDICAID_AND_CHIP');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('CONTRACT_ONLY', 'CONTRACT_AND_RATES');

-- AlterTable
ALTER TABLE "ContractRevisionTable" DROP COLUMN "name",
ADD COLUMN     "addtlActuaryCommunicationPreference" "ActuaryCommunication",
ADD COLUMN     "contractDateEnd" TIMESTAMP(3),
ADD COLUMN     "contractDateStart" TIMESTAMP(3),
ADD COLUMN     "contractExecutionStatus" "ContractExecutionStatus",
ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "federalAuthorities" "FederalAuthority"[],
ADD COLUMN     "inLieuServicesAndSettings" BOOLEAN,
ADD COLUMN     "managedCareEntities" "ManagedCareEntity"[],
ADD COLUMN     "modifiedBenefitsProvided" BOOLEAN,
ADD COLUMN     "modifiedEnrollmentProcess" BOOLEAN,
ADD COLUMN     "modifiedGeoAreaServed" BOOLEAN,
ADD COLUMN     "modifiedGrevienceAndAppeal" BOOLEAN,
ADD COLUMN     "modifiedIncentiveArrangements" BOOLEAN,
ADD COLUMN     "modifiedLengthOfContract" BOOLEAN,
ADD COLUMN     "modifiedMedicaidBeneficiaries" BOOLEAN,
ADD COLUMN     "modifiedMedicalLossRatioStandards" BOOLEAN,
ADD COLUMN     "modifiedNetworkAdequacyStandards" BOOLEAN,
ADD COLUMN     "modifiedNonRiskPaymentArrangements" BOOLEAN,
ADD COLUMN     "modifiedOtherFinancialPaymentIncentive" BOOLEAN,
ADD COLUMN     "modifiedPassThroughPayments" BOOLEAN,
ADD COLUMN     "modifiedPaymentsForMentalDiseaseInstitutions" BOOLEAN,
ADD COLUMN     "modifiedRiskSharingStrategy" BOOLEAN,
ADD COLUMN     "modifiedStateDirectedPayments" BOOLEAN,
ADD COLUMN     "modifiedWitholdAgreements" BOOLEAN,
ADD COLUMN     "populationCovered" "PopulationCoverageType",
ADD COLUMN     "programIDs" TEXT[],
ADD COLUMN     "riskBasedContract" BOOLEAN,
ADD COLUMN     "submissionDescription" TEXT,
ADD COLUMN     "submissionType" "SubmissionType" NOT NULL;

-- AlterTable
ALTER TABLE "ContractTable" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stateCode" TEXT NOT NULL,
ADD COLUMN     "stateNumber" INTEGER NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RateRevisionTable" ADD COLUMN     "actuaryCommunicationPreference" "ActuaryCommunication",
ADD COLUMN     "amendmentEffectiveDateEnd" TIMESTAMP(3),
ADD COLUMN     "amendmentEffectiveDateStart" TIMESTAMP(3),
ADD COLUMN     "rateCapitationType" "RateCapitationType",
ADD COLUMN     "rateCertificationName" TEXT,
ADD COLUMN     "rateDateCertified" TIMESTAMP(3),
ADD COLUMN     "rateDateEnd" TIMESTAMP(3),
ADD COLUMN     "rateDateStart" TIMESTAMP(3),
ADD COLUMN     "rateProgramIDs" TEXT[],
ADD COLUMN     "rateType" "RateType";

-- AlterTable
ALTER TABLE "RateTable" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stateCode" TEXT NOT NULL,
ADD COLUMN     "stateNumber" INTEGER NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "latestStateRateCertNumber" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserAudit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SharedRateCertifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedRateCertifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActuaryContact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "titleRole" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "actuarialFirm" "ActuarialFirm" NOT NULL,
    "actuarialFirmOther" TEXT,
    "contractRevisionID" TEXT,
    "rateRevisionID" TEXT,

    CONSTRAINT "ActuaryContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "documentCategories" "DocumentCategory"[],
    "sha256" TEXT,
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSupportingDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "documentCategories" "DocumentCategory"[],
    "sha256" TEXT,
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "ContractSupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "documentCategories" "DocumentCategory"[],
    "sha256" TEXT,
    "rateRevisionID" TEXT NOT NULL,

    CONSTRAINT "RateDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateSupportingDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "documentCategories" "DocumentCategory"[],
    "sha256" TEXT,
    "rateRevisionID" TEXT NOT NULL,

    CONSTRAINT "RateSupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateContact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "titleRole" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "StateContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContractRevisionTableToSharedRateCertifications" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_RateRevisionTableToSharedRateCertifications" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ContractRevisionTableToSharedRateCertifications_AB_unique" ON "_ContractRevisionTableToSharedRateCertifications"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractRevisionTableToSharedRateCertifications_B_index" ON "_ContractRevisionTableToSharedRateCertifications"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RateRevisionTableToSharedRateCertifications_AB_unique" ON "_RateRevisionTableToSharedRateCertifications"("A", "B");

-- CreateIndex
CREATE INDEX "_RateRevisionTableToSharedRateCertifications_B_index" ON "_RateRevisionTableToSharedRateCertifications"("B");

-- AddForeignKey
ALTER TABLE "ContractTable" ADD CONSTRAINT "ContractTable_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateTable" ADD CONSTRAINT "RateTable_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSupportingDocument" ADD CONSTRAINT "ContractSupportingDocument_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocument" ADD CONSTRAINT "RateDocument_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSupportingDocument" ADD CONSTRAINT "RateSupportingDocument_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateContact" ADD CONSTRAINT "StateContact_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToSharedRateCertifications" ADD CONSTRAINT "_ContractRevisionTableToSharedRateCertifications_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToSharedRateCertifications" ADD CONSTRAINT "_ContractRevisionTableToSharedRateCertifications_B_fkey" FOREIGN KEY ("B") REFERENCES "SharedRateCertifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RateRevisionTableToSharedRateCertifications" ADD CONSTRAINT "_RateRevisionTableToSharedRateCertifications_A_fkey" FOREIGN KEY ("A") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RateRevisionTableToSharedRateCertifications" ADD CONSTRAINT "_RateRevisionTableToSharedRateCertifications_B_fkey" FOREIGN KEY ("B") REFERENCES "SharedRateCertifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
