BEGIN;

-- DropTable
DROP TABLE "oauth_clients";

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "grants" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "description" TEXT,
    "contactEmail" TEXT NOT NULL,
    "userID" TEXT NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;