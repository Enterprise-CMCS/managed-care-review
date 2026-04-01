BEGIN;
CREATE TABLE IF NOT EXISTS "SDPDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL DEFAULT -1,
    "name" TEXT NOT NULL,
    "s3URL" TEXT NOT NULL,
    "s3BucketName" TEXT,
    "s3Key" TEXT,
    "sha256" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3),
    "sdpRevisionID" TEXT NOT NULL,

    CONSTRAINT "SDPDocument_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SDPDocument_sdpRevisionID_fkey'
    ) THEN
        ALTER TABLE "SDPDocument"
        ADD CONSTRAINT "SDPDocument_sdpRevisionID_fkey"
        FOREIGN KEY ("sdpRevisionID") REFERENCES "SDPRevisionTable"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
COMMIT;