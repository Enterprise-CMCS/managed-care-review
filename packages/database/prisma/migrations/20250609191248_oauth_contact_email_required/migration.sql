BEGIN;

-- Make contactEmail required in oauth_clients
ALTER TABLE "oauth_clients" ALTER COLUMN "contactEmail" SET NOT NULL;

COMMIT;
