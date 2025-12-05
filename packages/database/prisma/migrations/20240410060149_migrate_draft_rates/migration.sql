BEGIN;
-- This migration finds all draft contract and rate revisions and makes entries in
-- the DraftRateJoinTable, with their order defined by RANK
INSERT INTO "DraftRateJoinTable" ("contractID", "rateID", "ratePosition")
SELECT "ContractRevisionTable"."contractID", "RateRevisionTable"."rateID", RANK() OVER (
    PARTITION BY "ContractRevisionTable".id
    ORDER BY "RateRevisionTable"."createdAt" DESC
) from "ContractRevisionTable", "_ContractRevisionTableToRateTable", "RateRevisionTable" WHERE 
    "ContractRevisionTable".id = "_ContractRevisionTableToRateTable"."A" AND 
    "_ContractRevisionTableToRateTable"."B" = "RateRevisionTable"."rateID" AND 
    "RateRevisionTable"."submitInfoID" IS NULL AND 
    "ContractRevisionTable"."submitInfoID" IS NULL
ON CONFLICT DO NOTHING;
COMMIT;
