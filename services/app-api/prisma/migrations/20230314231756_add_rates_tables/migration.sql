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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "contractDescription" TEXT,

    CONSTRAINT "ContractRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRevisionTable" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "rateCertURL" TEXT,

    CONSTRAINT "RateRevisionTable_pkey" PRIMARY KEY ("id")
);
