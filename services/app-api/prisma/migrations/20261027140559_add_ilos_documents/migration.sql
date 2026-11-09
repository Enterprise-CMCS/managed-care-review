BEGIN;

-- CreateTable
CREATE TABLE "ILOSDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "s3BucketName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3),
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "ILOSDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ILOSSupportingDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "s3BucketName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3),
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "ILOSSupportingDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ILOSDocument" ADD CONSTRAINT "ILOSDocument_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ILOSSupportingDocument" ADD CONSTRAINT "ILOSSupportingDocument_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
