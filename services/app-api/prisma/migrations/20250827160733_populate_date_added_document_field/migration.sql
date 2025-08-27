BEGIN;
UPDATE "ContractDocument" cd
SET "dateAdded" = ui."updatedAt"
FROM "ContractRevisionTable" cr
INNER JOIN "UpdateInfoTable" ui ON cr."submitInfoID" = ui."id"
WHERE cd."dateAdded" IS NULL
  AND cd."contractRevisionID" = cr."id"
  AND cr."submitInfoID" IS NOT NULL;
COMMIT;