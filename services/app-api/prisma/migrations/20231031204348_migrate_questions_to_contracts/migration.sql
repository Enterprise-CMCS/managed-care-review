BEGIN;

ALTER TABLE "Question" ADD COLUMN "contractID" TEXT;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- migrate data over
UPDATE "Question" SET "contractID"="pkgID";

-- make not nullable, drop pkgID
ALTER TABLE "Question" 
  ALTER COLUMN "contractID" SET NOT NULL,
  DROP CONSTRAINT "Question_pkgID_fkey",
  DROP COLUMN "pkgID";

COMMIT;
