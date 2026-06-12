BEGIN;
-- CreateTable
CREATE TABLE "ContractRevisionOverrides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractOverrideID" TEXT NOT NULL,
    "contractRevisionID" TEXT NOT NULL,
    "contractType" "ContractType",

    CONSTRAINT "ContractRevisionOverrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractRevisionOverrides_contractOverrideID_key" ON "ContractRevisionOverrides"("contractOverrideID");

-- AddForeignKey
ALTER TABLE "ContractRevisionOverrides" ADD CONSTRAINT "ContractRevisionOverrides_contractOverrideID_fkey" FOREIGN KEY ("contractOverrideID") REFERENCES "ContractOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionOverrides" ADD CONSTRAINT "ContractRevisionOverrides_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;