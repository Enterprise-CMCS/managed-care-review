-- CreateTable
CREATE TABLE "StateSubmission" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "submissionFormProto" BYTEA NOT NULL,

    CONSTRAINT "StateSubmission_pkey" PRIMARY KEY ("id")
);
