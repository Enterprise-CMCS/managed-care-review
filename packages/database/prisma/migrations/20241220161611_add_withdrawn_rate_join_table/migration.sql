BEGIN;

-- CreateTable
CREATE TABLE "WithdrawnRatesJoinTable" (
    "contractID" TEXT NOT NULL,
    "rateID" TEXT NOT NULL,

    CONSTRAINT "WithdrawnRatesJoinTable_pkey" PRIMARY KEY ("contractID","rateID")
);

-- AddForeignKey
ALTER TABLE "WithdrawnRatesJoinTable" ADD CONSTRAINT "WithdrawnRatesJoinTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawnRatesJoinTable" ADD CONSTRAINT "WithdrawnRatesJoinTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
