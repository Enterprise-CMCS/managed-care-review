BEGIN;
-- CreateTable
CREATE TABLE "RateRevisionOverrides" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rateOverrideID" TEXT NOT NULL,
    "rateRevisionID" TEXT NOT NULL,

    CONSTRAINT "RateRevisionOverrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateDocumentOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rateRevisionOverrideID" TEXT NOT NULL,
    "documentID" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3),

    CONSTRAINT "RateDocumentOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateSupportingDocumentOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rateRevisionOverrideID" TEXT NOT NULL,
    "documentID" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3),

    CONSTRAINT "RateSupportingDocumentOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateRevisionOverrides_rateOverrideID_key" ON "RateRevisionOverrides"("rateOverrideID");

-- AddForeignKey
ALTER TABLE "RateRevisionOverrides" ADD CONSTRAINT "RateRevisionOverrides_rateOverrideID_fkey" FOREIGN KEY ("rateOverrideID") REFERENCES "RateOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionOverrides" ADD CONSTRAINT "RateRevisionOverrides_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocumentOverride" ADD CONSTRAINT "RateDocumentOverride_rateRevisionOverrideID_fkey" FOREIGN KEY ("rateRevisionOverrideID") REFERENCES "RateRevisionOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocumentOverride" ADD CONSTRAINT "RateDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSupportingDocumentOverride" ADD CONSTRAINT "RateSupportingDocumentOverride_rateRevisionOverrideID_fkey" FOREIGN KEY ("rateRevisionOverrideID") REFERENCES "RateRevisionOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSupportingDocumentOverride" ADD CONSTRAINT "RateSupportingDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "RateSupportingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
