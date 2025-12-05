BEGIN;
-- CreateTable
CREATE TABLE "StateProgram" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "isRateProgram" BOOLEAN NOT NULL,

    CONSTRAINT "StateProgram_pkey" PRIMARY KEY ("id")
);
COMMIT;
