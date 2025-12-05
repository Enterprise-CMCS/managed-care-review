/*
  Warnings:

  - You are about to drop the `TestUser` table. If the table is not empty, all the data it contains will be lost.

*/

-- Rename HPP Table
ALTER TABLE "StateSubmission" RENAME TO "HealthPlanPackageTable";

-- Rename HPR Table
ALTER TABLE "StateSubmissionRevision" RENAME TO "HealthPlanRevisionTable";

-- Rename HPR Fields
ALTER TABLE "HealthPlanRevisionTable" RENAME COLUMN "submissionID" TO "pkgID";
ALTER TABLE "HealthPlanRevisionTable" RENAME COLUMN "submissionFormProto" TO "formDataProto";

-- Rename Constraints
ALTER TABLE "HealthPlanPackageTable" RENAME CONSTRAINT "StateSubmission_stateCode_fkey" TO "HealthPlanPackageTable_stateCode_fkey";
ALTER TABLE "HealthPlanPackageTable" RENAME CONSTRAINT "StateSubmission_pkey" TO "HealthPlanPackageTable_pkey";
ALTER TABLE "HealthPlanRevisionTable" RENAME CONSTRAINT "StateSubmissionRevision_submissionID_fkey" TO "HealthPlanRevisionTable_pkgID_fkey";
ALTER TABLE "HealthPlanRevisionTable" RENAME CONSTRAINT "StateSubmissionRevision_pkey" TO "HealthPlanRevisionTable_pkey";

-- DropTable
DROP TABLE "TestUser";
