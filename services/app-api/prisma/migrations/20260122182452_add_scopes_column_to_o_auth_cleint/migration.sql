BEGIN;

-- CreateEnum
CREATE TYPE "OAuthScope" AS ENUM ('CMS_SUBMISSION_ACTIONS');

-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "scopes" "OAuthScope"[] DEFAULT ARRAY[]::"OAuthScope"[];

COMMIT;
