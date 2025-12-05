CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "StateSubmissionRevision" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "submissionID" TEXT NOT NULL,
    "submissionFormProto" BYTEA NOT NULL,

    CONSTRAINT "StateSubmissionRevision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StateSubmissionRevision" ADD CONSTRAINT "StateSubmissionRevision_submissionID_fkey" FOREIGN KEY ("submissionID") REFERENCES "StateSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateRevisionForEachExistingSubmission
INSERT INTO "StateSubmissionRevision" 
SELECT uuid_generate_v4() AS "id", now() AS "createdAt", "id" AS "submissionID","submissionFormProto"
FROM "StateSubmission";
