CREATE TABLE "SDPStateContact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL DEFAULT -1,
    "name" TEXT,
    "titleRole" TEXT,
    "email" TEXT,
    "sdpRevisionID" TEXT NOT NULL,

    CONSTRAINT "SDPStateContact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SDPStateContact"
ADD CONSTRAINT "SDPStateContact_sdpRevisionID_fkey"
FOREIGN KEY ("sdpRevisionID") REFERENCES "SDPRevisionTable"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
