BEGIN;

-- Create submitInfo records and reviewStatusActions for each withdrawInfo
DO $$
DECLARE
  rate_record RECORD;
  latest_revision RECORD;
  withdraw_info RECORD;
  submit_info_id UUID;
  withdraw_info_ids TEXT[] := '{}';
BEGIN
  -- Loop through each rate with a withdrawInfoID
  FOR rate_record IN
    SELECT r.id, r."withdrawInfoID"
    FROM "RateTable" r
    WHERE r."withdrawInfoID" IS NOT NULL
  LOOP
    -- Get the withdraw info
    SELECT * INTO withdraw_info
    FROM "UpdateInfoTable"
    WHERE id = rate_record."withdrawInfoID";

    -- Find the latest revision for this rate
    SELECT * INTO latest_revision
    FROM "RateRevisionTable"
    WHERE "rateID" = rate_record.id
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE WARNING 'No revisions found for rate with ID: %', rate_record.id;
      CONTINUE;
    END IF;

    -- Create a new submitInfo record
    submit_info_id := uuid_generate_v4();
    INSERT INTO "UpdateInfoTable" (
      id,
      "updatedAt",
      "updatedByID",
      "updatedReason"
    ) VALUES (
      submit_info_id,
      -- Add 50ms to updateAt timestamp so it will be after the unlockInfo timestamp.
      withdraw_info."updatedAt" + INTERVAL '50 milliseconds',
      withdraw_info."updatedByID",
      withdraw_info."updatedReason"
    );

    -- Update the latest revision with the new submitInfo
    UPDATE "RateRevisionTable"
    SET "submitInfoID" = submit_info_id
    WHERE id = latest_revision.id;

    -- Create a reviewStatusActions record of type WITHDRAW
    INSERT INTO "RateActionTable" (
      id,
      "updatedAt",
      "updatedByID",
      "updatedReason",
      "actionType",
      "rateID"
    ) VALUES (
      uuid_generate_v4(),
      -- Match timestamp of the submitInfo.
      withdraw_info."updatedAt" + INTERVAL '50 milliseconds',
      withdraw_info."updatedByID",
      withdraw_info."updatedReason",
      'WITHDRAW',
      rate_record.id
    );

    -- Store the withdrawInfoID to delete later
    withdraw_info_ids := array_append(withdraw_info_ids, rate_record."withdrawInfoID");

    -- Remove the withdrawInfo relationship from the rate
    UPDATE "RateTable"
    SET "withdrawInfoID" = NULL
    WHERE id = rate_record.id;

    RAISE NOTICE 'Processed rate ID: % - Created submitInfo and reviewStatusAction', rate_record.id;
  END LOOP;

  -- Delete all the withdrawInfo records from UpdateInfoTable
  DELETE FROM "UpdateInfoTable"
  WHERE id = ANY(withdraw_info_ids);

  RAISE NOTICE 'Deleted % withdrawInfo records from UpdateInfoTable', array_length(withdraw_info_ids, 1);
END $$;

COMMIT;
