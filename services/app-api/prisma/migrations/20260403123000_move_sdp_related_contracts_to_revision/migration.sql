BEGIN;
ALTER TABLE "ContractSDPJoinTable"
ADD COLUMN IF NOT EXISTS "sdpRevisionID" TEXT;

WITH latest_revision AS (
    SELECT DISTINCT ON (revision."sdpID")
        revision."sdpID",
        revision."id" AS "sdpRevisionID"
    FROM "SDPRevisionTable" revision
    ORDER BY revision."sdpID", revision."createdAt" DESC
)
UPDATE "ContractSDPJoinTable" link
SET "sdpRevisionID" = latest_revision."sdpRevisionID"
FROM latest_revision
WHERE link."sdpID" = latest_revision."sdpID"
  AND link."sdpRevisionID" IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ContractSDPJoinTable_pkey'
    ) THEN
        ALTER TABLE "ContractSDPJoinTable"
        DROP CONSTRAINT "ContractSDPJoinTable_pkey";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ContractSDPJoinTable_sdpID_fkey'
    ) THEN
        ALTER TABLE "ContractSDPJoinTable"
        DROP CONSTRAINT "ContractSDPJoinTable_sdpID_fkey";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ContractSDPJoinTable_sdpRevisionID_fkey'
    ) THEN
        ALTER TABLE "ContractSDPJoinTable"
        ADD CONSTRAINT "ContractSDPJoinTable_sdpRevisionID_fkey"
        FOREIGN KEY ("sdpRevisionID")
        REFERENCES "SDPRevisionTable"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "ContractSDPJoinTable"
ALTER COLUMN "sdpRevisionID" SET NOT NULL;

ALTER TABLE "ContractSDPJoinTable"
ADD CONSTRAINT "ContractSDPJoinTable_pkey"
PRIMARY KEY ("contractID", "sdpRevisionID");

ALTER TABLE "ContractSDPJoinTable"
DROP COLUMN IF EXISTS "sdpID";
COMMIT;