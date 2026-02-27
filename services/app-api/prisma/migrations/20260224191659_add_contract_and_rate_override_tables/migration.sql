BEGIN;
-- CreateTable
CREATE TABLE "ContractOverrides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByID" TEXT,
    "contractID" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "initiallySubmittedAt" TIMESTAMP(3),

    CONSTRAINT "ContractOverrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateOverrides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByID" TEXT,
    "rateID" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "initiallySubmittedAt" TIMESTAMP(3),

    CONSTRAINT "RateOverrides_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractOverrides" ADD CONSTRAINT "ContractOverrides_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractOverrides" ADD CONSTRAINT "ContractOverrides_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateOverrides" ADD CONSTRAINT "RateOverrides_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateOverrides" ADD CONSTRAINT "RateOverrides_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
