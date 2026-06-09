-- All submitted DSNP contracts, using each contract's MOST RECENT submission.
-- Feeds generate_dsnp_spreadsheet.py, which builds the final spreadsheet:
--   Contract Name | State | contractID | federalAuthorities |
--   rateMedicaidPopulations | dsnpContract | Initial/Latest Submission Date
--
-- The contract name (MCR-XX-NNNN-PROGRAM) is NOT built here: program short-names
-- live in statePrograms.json, not the database, so the companion script resolves
-- the program_ids this query returns into names.
--
-- A contract qualifies if it is a DSNP contract as of its LATEST submitted
-- revision. All form data (federalAuthorities, programIDs, rate populations) is
-- read from that same latest submission, so every field reflects the most
-- up-to-date version. Contracts that have never been submitted are excluded.
--
-- Optional date filtering via the psql vars :from_date / :to_date (an empty
-- string means unbounded). Pass both for a range, just :from_date for "that date
-- onward", or neither for everything. :basis selects which submission date the
-- window applies to: 'initial' (default) or 'latest'.

WITH submitted_revs AS (
    -- every contract revision that has actually been submitted
    SELECT cr.id            AS rev_id,
           cr."contractID"  AS contract_id,
           cr."dsnpContract" AS dsnp_contract,
           cr."federalAuthorities" AS federal_authorities,
           cr."programIDs"  AS program_ids,
           u."updatedAt"    AS submitted_at
    FROM "ContractRevisionTable" cr
    JOIN "UpdateInfoTable" u ON u.id = cr."submitInfoID"
),
latest_rev AS (
    -- the most recent submitted revision per contract = current form data
    SELECT DISTINCT ON (contract_id) *
    FROM submitted_revs
    ORDER BY contract_id, submitted_at DESC
),
initial_sub AS (
    -- the contract's first-ever submission date
    SELECT contract_id, MIN(submitted_at)::date AS initial_submitted_date
    FROM submitted_revs
    GROUP BY contract_id
),
rate_pop_distinct AS (
    -- distinct Medicaid populations across the rates in the latest revision's package
    SELECT DISTINCT sp."contractRevisionID" AS rev_id, pop::text AS pop
    FROM "SubmissionPackageJoinTable" sp
    JOIN "RateRevisionTable" rr ON rr.id = sp."rateRevisionID"
    CROSS JOIN LATERAL unnest(rr."rateMedicaidPopulations") AS pop
),
rate_pops AS (
    SELECT rev_id,
           string_agg(pop, ',' ORDER BY
               CASE pop
                   WHEN 'MEDICARE_MEDICAID_WITH_DSNP'    THEN 1
                   WHEN 'MEDICAID_ONLY'                  THEN 2
                   WHEN 'MEDICARE_MEDICAID_WITHOUT_DSNP' THEN 3
                   ELSE 99
               END) AS rate_medicaid_populations
    FROM rate_pop_distinct
    GROUP BY rev_id
)
SELECT s.name                                       AS state_name,
       c."stateCode"                                AS state_code,
       c."stateNumber"                              AS state_number,
       lr.contract_id                               AS contract_id,
       array_to_string(lr.federal_authorities, ',') AS federal_authorities,
       rp.rate_medicaid_populations                 AS rate_medicaid_populations,
       lr.dsnp_contract                             AS dsnp_contract,
       array_to_string(lr.program_ids, ',')         AS program_ids,
       isub.initial_submitted_date                  AS initial_submitted_date,
       lr.submitted_at::date                        AS latest_submitted_date
FROM latest_rev lr
JOIN "ContractTable" c   ON c.id = lr.contract_id
JOIN "State" s           ON s."stateCode" = c."stateCode"
JOIN initial_sub isub    ON isub.contract_id = lr.contract_id
LEFT JOIN rate_pops rp   ON rp.rev_id = lr.rev_id
WHERE lr.dsnp_contract = true
  AND (NULLIF(:'from_date', '') IS NULL
       OR (CASE WHEN :'basis' = 'latest' THEN lr.submitted_at::date
                ELSE isub.initial_submitted_date END) >= NULLIF(:'from_date', '')::date)
  AND (NULLIF(:'to_date', '') IS NULL
       OR (CASE WHEN :'basis' = 'latest' THEN lr.submitted_at::date
                ELSE isub.initial_submitted_date END) <= NULLIF(:'to_date', '')::date)
ORDER BY c."stateCode", c."stateNumber";
