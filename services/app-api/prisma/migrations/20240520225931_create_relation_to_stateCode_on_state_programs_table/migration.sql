BEGIN;
-- AddForeignKey
ALTER TABLE "StateProgram" ADD CONSTRAINT "StateProgram_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "State"("stateCode") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;