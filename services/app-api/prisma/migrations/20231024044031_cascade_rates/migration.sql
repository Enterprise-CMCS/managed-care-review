BEGIN;
-- DropForeignKey
ALTER TABLE "ActuaryContact" DROP CONSTRAINT "ActuaryContact_rateWithAddtlActuaryID_fkey";

-- DropForeignKey
ALTER TABLE "ActuaryContact" DROP CONSTRAINT "ActuaryContact_rateWithCertifyingActuaryID_fkey";

-- DropForeignKey
ALTER TABLE "RateDocument" DROP CONSTRAINT "RateDocument_rateRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionTable" DROP CONSTRAINT "RateRevisionTable_submitInfoID_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionTable" DROP CONSTRAINT "RateRevisionTable_unlockInfoID_fkey";

-- DropForeignKey
ALTER TABLE "RateSupportingDocument" DROP CONSTRAINT "RateSupportingDocument_rateRevisionID_fkey";

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_rateWithCertifyingActuaryID_fkey" FOREIGN KEY ("rateWithCertifyingActuaryID") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_rateWithAddtlActuaryID_fkey" FOREIGN KEY ("rateWithAddtlActuaryID") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocument" ADD CONSTRAINT "RateDocument_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSupportingDocument" ADD CONSTRAINT "RateSupportingDocument_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
