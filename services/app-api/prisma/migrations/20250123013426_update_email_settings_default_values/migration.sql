BEGIN;

-- AlterTable
ALTER TABLE "EmailSettings" ALTER COLUMN "emailSource" SET DEFAULT 'mc-review-qa@truss.works',
ALTER COLUMN "devReviewTeamEmails" SET DEFAULT ARRAY['<Dev Team <mc-review-qa+DevTeam@truss.works>']::TEXT[],
ALTER COLUMN "helpDeskEmail" SET DEFAULT ARRAY['Helpdesk <mc-review-qa+MC_Review_HelpDesk@truss.works>']::TEXT[];

-- UpdateRecord
UPDATE "EmailSettings"
SET 
    "emailSource" = 'mc-review-qa@truss.works',
    "devReviewTeamEmails" = ARRAY['<Dev Team <mc-review-qa+DevTeam@truss.works>']::TEXT[],
    "helpDeskEmail" = ARRAY['Helpdesk <mc-review-qa+MC_Review_HelpDesk@truss.works>']::TEXT[]
WHERE id = 1;

COMMIT;