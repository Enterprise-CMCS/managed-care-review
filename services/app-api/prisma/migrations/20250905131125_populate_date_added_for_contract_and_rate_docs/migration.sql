BEGIN;

WITH first_seen_dates AS (
  SELECT
    cd."sha256",
    cr."contractID",
    MIN(ui."updatedAt") AS first_seen_at
  FROM "ContractDocument" cd
  JOIN "ContractRevisionTable" cr ON cd."contractRevisionID" = cr."id"
  JOIN "UpdateInfoTable" ui ON cr."submitInfoID" = ui."id"
  GROUP BY cd."sha256", cr."contractID"
)

UPDATE "ContractDocument" cd
SET "dateAdded" = fsd.first_seen_at
FROM "ContractRevisionTable" cr,
     first_seen_dates fsd
WHERE cd."contractRevisionID" = cr."id"
  AND cd."sha256" = fsd."sha256"
  AND cr."contractID" = fsd."contractID"
  AND cd."dateAdded" IS NULL
  AND cr."submitInfoID" IS NOT NULL;
  
 WITH first_seen_dates AS (
  SELECT
    csd."sha256",
    cr."contractID",
    MIN(ui."updatedAt") AS first_seen_at
  FROM "ContractSupportingDocument" csd
  JOIN "ContractRevisionTable" cr ON csd."contractRevisionID" = cr."id"
  JOIN "UpdateInfoTable" ui ON cr."submitInfoID" = ui."id"
  GROUP BY csd."sha256", cr."contractID"
)

UPDATE "ContractSupportingDocument" csd
SET "dateAdded" = fsd.first_seen_at
FROM "ContractRevisionTable" cr,
     first_seen_dates fsd
WHERE csd."contractRevisionID" = cr."id"
  AND csd."sha256" = fsd."sha256"
  AND cr."contractID" = fsd."contractID"
  AND csd."dateAdded" IS NULL
  AND cr."submitInfoID" IS NOT NULL;

WITH first_seen_dates AS (
  SELECT
    rd."sha256",
    rr."rateID",
    MIN(ui."updatedAt") AS first_seen_at
  FROM "RateDocument" rd
  JOIN "RateRevisionTable" rr ON rd."rateRevisionID" = rr."id"
  JOIN "UpdateInfoTable" ui ON rr."submitInfoID" = ui."id"
  GROUP BY rd."sha256", rr."rateID"
)

UPDATE "RateDocument" rd
SET "dateAdded" = fsd.first_seen_at
FROM "RateRevisionTable" rr,
     first_seen_dates fsd
WHERE rd."rateRevisionID" = rr."id"
  AND rd."sha256" = fsd."sha256"
  AND rr."rateID" = fsd."rateID"
  AND rd."dateAdded" IS NULL
  AND rr."submitInfoID" IS NOT NULL;
  
WITH first_seen_dates AS (
  SELECT
    rsd."sha256",
    rr."rateID",
    MIN(ui."updatedAt") AS first_seen_at
  FROM "RateSupportingDocument" rsd
  JOIN "RateRevisionTable" rr ON rsd."rateRevisionID" = rr."id"
  JOIN "UpdateInfoTable" ui ON rr."submitInfoID" = ui."id"
  GROUP BY rsd."sha256", rr."rateID"
)

UPDATE "RateSupportingDocument" rsd
SET "dateAdded" = fsd.first_seen_at
FROM "RateRevisionTable" rr,
     first_seen_dates fsd
WHERE rsd."rateRevisionID" = rr."id"
  AND rsd."sha256" = fsd."sha256"
  AND rr."rateID" = fsd."rateID"
  AND rsd."dateAdded" IS NULL
  AND rr."submitInfoID" IS NOT NULL;

COMMIT;