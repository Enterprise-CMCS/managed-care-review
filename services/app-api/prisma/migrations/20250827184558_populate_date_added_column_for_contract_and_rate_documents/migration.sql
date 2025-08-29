BEGIN;

UPDATE "ContractDocument" cd
SET "dateAdded" = ui."updatedAt"
FROM "ContractRevisionTable" cr
INNER JOIN "UpdateInfoTable" ui ON cr."submitInfoID" = ui."id"
WHERE cd."dateAdded" IS NULL
  AND cd."contractRevisionID" = cr."id"
  AND cr."submitInfoID" IS NOT NULL;

UPDATE "ContractSupportingDocument" csd
SET "dateAdded" = ui."updatedAt"
FROM "ContractRevisionTable" cr
INNER JOIN "UpdateInfoTable" ui ON cr."submitInfoID" = ui."id"
WHERE csd."dateAdded" IS NULL
  AND csd."contractRevisionID" = cr."id"
  AND cr."submitInfoID" IS NOT NULL;

UPDATE "RateDocument" rd
SET "dateAdded" = ui."updatedAt"
FROM "RateRevisionTable" rr
INNER JOIN "UpdateInfoTable" ui ON rr."submitInfoID" = ui."id"
WHERE rd."dateAdded" IS NULL
  AND rd."rateRevisionID" = rr."id"
  AND rr."submitInfoID" IS NOT NULL;

UPDATE "RateSupportingDocument" rsd
SET "dateAdded" = ui."updatedAt"
FROM "RateRevisionTable" rr
INNER JOIN "UpdateInfoTable" ui ON rr."submitInfoID" = ui."id"
WHERE rsd."dateAdded" IS NULL
  AND rsd."rateRevisionID" = rr."id"
  AND rr."submitInfoID" IS NOT NULL;

COMMIT;