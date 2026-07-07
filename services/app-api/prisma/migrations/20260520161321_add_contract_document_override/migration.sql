BEGIN;

-- CreateTable
CREATE TABLE "ContractDocumentOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractRevisionOverrideID" TEXT NOT NULL,
    "documentID" TEXT,
    "name" TEXT,
    "s3URL" TEXT,
    "s3BucketName" TEXT,
    "s3Key" TEXT,
    "sha256" TEXT,
    "dateAdded" TIMESTAMP(3),

    CONSTRAINT "ContractDocumentOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSupportingDocumentOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractRevisionOverrideID" TEXT NOT NULL,
    "documentID" TEXT,
    "name" TEXT,
    "s3URL" TEXT,
    "s3BucketName" TEXT,
    "s3Key" TEXT,
    "sha256" TEXT,
    "dateAdded" TIMESTAMP(3),

    CONSTRAINT "ContractSupportingDocumentOverride_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractDocumentOverride" ADD CONSTRAINT "ContractDocumentOverride_contractRevisionOverrideID_fkey" FOREIGN KEY ("contractRevisionOverrideID") REFERENCES "ContractRevisionOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocumentOverride" ADD CONSTRAINT "ContractDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSupportingDocumentOverride" ADD CONSTRAINT "ContractSupportingDocumentOverride_contractRevisionOverrid_fkey" FOREIGN KEY ("contractRevisionOverrideID") REFERENCES "ContractRevisionOverrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSupportingDocumentOverride" ADD CONSTRAINT "ContractSupportingDocumentOverride_documentID_fkey" FOREIGN KEY ("documentID") REFERENCES "ContractSupportingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;