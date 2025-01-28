BEGIN;
-- AlterTable
ALTER TABLE "EmailSettings" ALTER COLUMN "devReviewTeamEmails" SET DEFAULT ARRAY['mc-review-qa+DevTeam@truss.works']::TEXT[],
ALTER COLUMN "cmsReviewHelpEmailAddress" SET DEFAULT ARRAY['mc-review-qa+MCOGDMCOActionsHelp@truss.works']::TEXT[],
ALTER COLUMN "cmsRateHelpEmailAddress" SET DEFAULT ARRAY['mc-review-qa+MMCratesettingHelp@truss.works']::TEXT[],
ALTER COLUMN "oactEmails" SET DEFAULT ARRAY['mc-review-qa+OACTdev1@truss.works', 'mc-review-qa+OACTdev2@truss.works']::TEXT[],
ALTER COLUMN "dmcpReviewEmails" SET DEFAULT ARRAY['mc-review-qa+DMCPreviewdev1@truss.works', 'mc-review-qa+DMCPreivewdev2@truss.works']::TEXT[],
ALTER COLUMN "dmcpSubmissionEmails" SET DEFAULT ARRAY['mc-review-qa+DMCPsubmissiondev1@truss.works', 'mc-review-qa+DMCPsubmissiondev2@truss.works']::TEXT[],
ALTER COLUMN "dmcoEmails" SET DEFAULT ARRAY['mc-review-qa+DMCO1@truss.works', 'mc-review-qa+DMCO2@truss.works']::TEXT[],
ALTER COLUMN "helpDeskEmail" SET DEFAULT ARRAY['mc-review-qa+MC_Review_HelpDesk@truss.works']::TEXT[];

-- Update existing record
UPDATE "EmailSettings"
SET
 "emailSource" = 'mc-review@cms.hhs.gov',
 "devReviewTeamEmails" = ARRAY['mc-review-qa+DevTeam@truss.works']::TEXT[],
 "cmsReviewHelpEmailAddress" = ARRAY['mc-review-qa+MCOGDMCOActionsHelp@truss.works']::TEXT[],
 "cmsRateHelpEmailAddress" = ARRAY['mc-review-qa+MMCratesettingHelp@truss.works']::TEXT[],
 "oactEmails" = ARRAY['mc-review-qa+OACTdev1@truss.works', 'mc-review-qa+OACTdev2@truss.works']::TEXT[],
 "dmcpReviewEmails" = ARRAY['mc-review-qa+DMCPreviewdev1@truss.works', 'mc-review-qa+DMCPreivewdev2@truss.works']::TEXT[],
 "dmcpSubmissionEmails" = ARRAY['mc-review-qa+DMCPsubmissiondev1@truss.works', 'mc-review-qa+DMCPsubmissiondev2@truss.works']::TEXT[],
 "dmcoEmails" = ARRAY['mc-review-qa+DMCO1@truss.works', 'mc-review-qa+DMCO2@truss.works']::TEXT[],
 "helpDeskEmail" = ARRAY['mc-review-qa+MC_Review_HelpDesk@truss.works']::TEXT[]
WHERE id = 1;

COMMIT;