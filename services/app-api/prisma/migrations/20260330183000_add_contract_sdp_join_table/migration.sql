BEGIN;

CREATE TABLE "ContractSDPJoinTable" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractID" TEXT NOT NULL,
    "sdpID" TEXT NOT NULL,

    CONSTRAINT "ContractSDPJoinTable_pkey" PRIMARY KEY ("contractID", "sdpID")
);

ALTER TABLE "ContractSDPJoinTable"
    ADD CONSTRAINT "ContractSDPJoinTable_contractID_fkey"
    FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "ContractSDPJoinTable"
    ADD CONSTRAINT "ContractSDPJoinTable_sdpID_fkey"
    FOREIGN KEY ("sdpID") REFERENCES "SDPTable"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

COMMIT;
