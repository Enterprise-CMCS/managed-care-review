BEGIN;

-- AlterTable
ALTER TABLE "EmailSettings" ALTER COLUMN "devReviewTeamEmails" SET DEFAULT ARRAY['Dev Team <mc-review-qa+DevTeam@truss.works>']::TEXT[];

-- UpdateRecord
UPDATE "EmailSettings"
SET 
    "devReviewTeamEmails" = ARRAY['Dev Team <mc-review-qa+DevTeam@truss.works>']::TEXT[]
WHERE id = 1;

COMMIT;