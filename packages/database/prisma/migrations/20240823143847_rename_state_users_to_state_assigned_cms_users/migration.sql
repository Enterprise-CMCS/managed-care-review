BEGIN;

-- Check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_StateToUser') THEN
        RAISE EXCEPTION 'Table "_StateToUser" does not exist';
    END IF;
END
$$;

-- Rename the join table
ALTER TABLE IF EXISTS public."_StateToUser" RENAME TO "_StateToAssignedCMSUser";

-- Drop the existing indexes
DROP INDEX IF EXISTS public."_StateToUser_AB_unique";
DROP INDEX IF EXISTS public."_StateToUser_B_index";

-- New indexes with updated table name
CREATE UNIQUE INDEX IF NOT EXISTS "_StateToAssignedCMSUser_AB_unique"
    ON public."_StateToAssignedCMSUser" USING btree
    ("A" COLLATE pg_catalog."default" ASC NULLS LAST, "B" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "_StateToAssignedCMSUser_B_index"
    ON public."_StateToAssignedCMSUser" USING btree
    ("B" COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

-- Update the foreign key constraints
ALTER TABLE IF EXISTS public."_StateToAssignedCMSUser"
    DROP CONSTRAINT IF EXISTS "_StateToUser_A_fkey",
    ADD CONSTRAINT "_StateToAssignedCMSUser_A_fkey" FOREIGN KEY ("A")
        REFERENCES public."State" ("stateCode") MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE IF EXISTS public."_StateToAssignedCMSUser"
    DROP CONSTRAINT IF EXISTS "_StateToUser_B_fkey",
    ADD CONSTRAINT "_StateToAssignedCMSUser_B_fkey" FOREIGN KEY ("B")
        REFERENCES public."User" (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE;

COMMIT;
