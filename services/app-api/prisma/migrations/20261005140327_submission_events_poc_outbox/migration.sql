BEGIN;

-- CreateTable
CREATE TABLE "SubmissionEventOutbox" (
    "id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "submissionID" TEXT NOT NULL,
    "event" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "snsMessageID" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SubmissionEventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionEventOutbox_stage_publishedAt_nextAttemptAt_idx" ON "SubmissionEventOutbox"("stage", "publishedAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionEventOutbox_stage_submissionID_key" ON "SubmissionEventOutbox"("stage", "submissionID");

COMMIT;
