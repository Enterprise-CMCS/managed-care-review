BEGIN;

UPDATE "User"
SET email = REPLACE(email, ' ', '')
WHERE email LIKE '% %';

COMMIT;