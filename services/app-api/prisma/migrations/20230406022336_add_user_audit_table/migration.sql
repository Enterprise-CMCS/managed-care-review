BEGIN;
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CHANGED_STATE_ASSIGNMENT', 'CHANGED_DIVISION_ASSIGNMENT');

-- CreateTable
CREATE TABLE "UserAudit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "description" TEXT,
    "priorValue" JSONB,

    CONSTRAINT "UserAudit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserAudit" ADD CONSTRAINT "UserAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAudit" ADD CONSTRAINT "UserAudit_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
