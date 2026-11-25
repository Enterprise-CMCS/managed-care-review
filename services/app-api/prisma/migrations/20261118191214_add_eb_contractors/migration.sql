BEGIN;

-- CreateTable
CREATE TABLE "EBContractors" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isDeprecated" BOOLEAN NOT NULL,

    CONSTRAINT "EBContractors_pkey" PRIMARY KEY ("id")
);

-- Populate the contractor list, preserving existing contractor UUIDs.
INSERT INTO "EBContractors" ("id", "name", "isDeprecated") VALUES
    ('161a7110-e8fc-43d3-b859-8c75f4680a3b', 'ALIGHT SOLUTIONS CARIBE Inc.', FALSE),
    ('4c70e567-819b-4d6f-b005-d6ae966246cb', 'Arkansas Foundation for Medical Care, Inc.', FALSE),
    ('026cd48b-9586-4bff-af5f-09bb2276e6be', 'Automated Health Systems, Inc.', FALSE),
    ('77da1c00-ba82-42dc-9094-cbfe5b2fd37f', 'Conduent State Healthcare, LLC', FALSE),
    ('141aa6a8-1eac-4d5e-9f93-d1a0ab023b38', 'Enterprise Services, LLC', FALSE),
    ('4ee845fb-70bf-4b9d-8b75-62767e56cd0a', 'Gainwell Technologies, LLC', FALSE),
    ('9f8aa3b7-1fcf-4d98-8609-2dcdfc464951', 'Maximus Health Services, Inc.', FALSE),
    ('2ba791fb-257d-440d-b9ea-72baaa6626c2', 'Maximus US Services, Inc.', FALSE),
    ('841b3d6b-96a3-4239-9893-99a1f8dcb3fc', 'Maximus, Inc.', FALSE),
    ('0a4deaca-cb89-4333-b90a-981463eb576e', 'TRUENORTH Corporation', FALSE);

COMMIT;
