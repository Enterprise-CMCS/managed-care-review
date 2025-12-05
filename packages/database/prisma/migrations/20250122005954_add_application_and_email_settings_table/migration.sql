BEGIN;

-- CreateTable
CREATE TABLE "ApplicationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "emailSettingsId" INTEGER DEFAULT 1,

    CONSTRAINT "ApplicationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "emailSource" TEXT NOT NULL DEFAULT 'mc-review@cms.hhs.gov',
    "devReviewTeamEmails" TEXT[] DEFAULT ARRAY['mc-review@cms.hhs.gov']::TEXT[],
    "cmsReviewHelpEmailAddress" TEXT[] DEFAULT ARRAY['MCOGDMCOActions <mc-review-qa+MCOGDMCOActionsHelp@truss.works>']::TEXT[],
    "cmsRateHelpEmailAddress" TEXT[] DEFAULT ARRAY['MMCratesetting <mc-review-qa+MMCratesettingHelp@truss.works>']::TEXT[],
    "oactEmails" TEXT[] DEFAULT ARRAY['OACT Dev1 <mc-review-qa+OACTdev1@truss.works>', 'OACT Dev2 <mc-review-qa+OACTdev2@truss.works>']::TEXT[],
    "dmcpReviewEmails" TEXT[] DEFAULT ARRAY['DMCP Review Dev1 <mc-review-qa+DMCPreviewdev1@truss.works>', 'DMCP Review Dev2 <mc-review-qa+DMCPreivewdev2@truss.works>']::TEXT[],
    "dmcpSubmissionEmails" TEXT[] DEFAULT ARRAY['DMCP Submission Dev1 <mc-review-qa+DMCPsubmissiondev1@truss.works>', 'DMCP Submission Dev2 <mc-review-qa+DMCPsubmissiondev2@truss.works>']::TEXT[],
    "dmcoEmails" TEXT[] DEFAULT ARRAY['DMCO Dev1 <mc-review-qa+DMCO1@truss.works>', 'DMCO Dev2 <mc-review-qa+DMCO2@truss.works>']::TEXT[],
    "helpDeskEmail" TEXT[] DEFAULT ARRAY['MC_Review_HelpDesk@cms.hhs.gov']::TEXT[],
    "applicationSettingsId" INTEGER DEFAULT 1,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSettings_emailSettingsId_key" ON "ApplicationSettings"("emailSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSettings_id_key" ON "ApplicationSettings"("id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_applicationSettingsId_key" ON "EmailSettings"("applicationSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_id_key" ON "EmailSettings"("id");

-- AddForeignKey
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_applicationSettingsId_fkey" FOREIGN KEY ("applicationSettingsId") REFERENCES "ApplicationSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert Initial Records
INSERT INTO "ApplicationSettings" ("id", "emailSettingsId") 
VALUES (1, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EmailSettings" (
    "id",
    "emailSource",
    "devReviewTeamEmails",
    "cmsReviewHelpEmailAddress",
    "cmsRateHelpEmailAddress",
    "oactEmails",
    "dmcpReviewEmails",
    "dmcpSubmissionEmails",
    "dmcoEmails",
    "helpDeskEmail",
    "applicationSettingsId"
) VALUES (
    1,
    'mc-review@cms.hhs.gov',
    ARRAY['mc-review@cms.hhs.gov'],
    ARRAY['MCOGDMCOActions <mc-review-qa+MCOGDMCOActionsHelp@truss.works>'],
    ARRAY['MMCratesetting <mc-review-qa+MMCratesettingHelp@truss.works>'],
    ARRAY['OACT Dev1 <mc-review-qa+OACTdev1@truss.works>', 'OACT Dev2 <mc-review-qa+OACTdev2@truss.works>'],
    ARRAY['DMCP Review Dev1 <mc-review-qa+DMCPreviewdev1@truss.works>', 'DMCP Review Dev2 <mc-review-qa+DMCPreivewdev2@truss.works>'],
    ARRAY['DMCP Submission Dev1 <mc-review-qa+DMCPsubmissiondev1@truss.works>', 'DMCP Submission Dev2 <mc-review-qa+DMCPsubmissiondev2@truss.works>'],
    ARRAY['DMCO Dev1 <mc-review-qa+DMCO1@truss.works>', 'DMCO Dev2 <mc-review-qa+DMCO2@truss.works>'],
    ARRAY['MC_Review_HelpDesk@cms.hhs.gov'],
    1
)
ON CONFLICT ("id") DO NOTHING;

COMMIT;