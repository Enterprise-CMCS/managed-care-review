BEGIN;
-- AlterTable
ALTER TABLE "ActuaryContact" ADD COLUMN     "display_seq" INTEGER;

-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN     "display_seq" INTEGER;

-- AlterTable
ALTER TABLE "RateDocument" ADD COLUMN     "display_seq" INTEGER;

-- AlterTable
ALTER TABLE "StateContact" ADD COLUMN     "display_seq" INTEGER;
COMMIT;
