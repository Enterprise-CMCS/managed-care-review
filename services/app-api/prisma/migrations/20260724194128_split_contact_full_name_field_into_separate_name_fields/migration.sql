BEGIN;

-- AlterTable
ALTER TABLE "ActuaryContact" ADD COLUMN     "familyName" TEXT,
ADD COLUMN     "givenName" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "suffix" TEXT;

-- AlterTable
ALTER TABLE "StateContact" ADD COLUMN     "familyName" TEXT,
ADD COLUMN     "givenName" TEXT,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "suffix" TEXT;

COMMIT;
