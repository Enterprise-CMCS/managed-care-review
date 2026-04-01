BEGIN;
ALTER TABLE "SDPRevisionTable"
ADD COLUMN IF NOT EXISTS "submitInfoID" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SDPRevisionTable_submitInfoID_fkey'
    ) THEN
        ALTER TABLE "SDPRevisionTable"
        ADD CONSTRAINT "SDPRevisionTable_submitInfoID_fkey"
        FOREIGN KEY ("submitInfoID")
        REFERENCES "UpdateInfoTable"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;
COMMIT;