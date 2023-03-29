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
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
