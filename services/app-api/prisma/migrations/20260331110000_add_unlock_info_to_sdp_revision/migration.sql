BEGIN;
ALTER TABLE "SDPRevisionTable"
ADD COLUMN IF NOT EXISTS "unlockInfoID" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SDPRevisionTable_unlockInfoID_fkey'
    ) THEN
        ALTER TABLE "SDPRevisionTable"
        ADD CONSTRAINT "SDPRevisionTable_unlockInfoID_fkey"
        FOREIGN KEY ("unlockInfoID")
        REFERENCES "UpdateInfoTable"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;
COMMIT;