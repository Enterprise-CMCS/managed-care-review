BEGIN;
-- CreateTable
CREATE TABLE "DraftRateJoinTable" (
    "contractID" TEXT NOT NULL,
    "rateID" TEXT NOT NULL,
    "ratePosition" INTEGER NOT NULL,

    CONSTRAINT "DraftRateJoinTable_pkey" PRIMARY KEY ("contractID","rateID")
);

-- AddForeignKey
ALTER TABLE "DraftRateJoinTable" ADD CONSTRAINT "DraftRateJoinTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftRateJoinTable" ADD CONSTRAINT "DraftRateJoinTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
