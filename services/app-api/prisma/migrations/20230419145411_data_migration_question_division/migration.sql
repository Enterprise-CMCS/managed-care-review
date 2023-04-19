-- UpdateTable
UPDATE "Question" SET "division" = COALESCE("User"."divisionAssignment", 'DMCO') FROM "User" WHERE "Question"."addedByUserID" = "User"."id";
