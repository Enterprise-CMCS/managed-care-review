# DSNP contracts report

Generates a spreadsheet of all DSNP contracts in MC-Review. Each row reflects a contract's
**most recent submitted revision**.

A contract is included if its latest submitted revision has `dsnpContract = true`
(so contracts updated to DSNP in a later resubmission are captured). Contracts
that have never been submitted are excluded.

## Prerequisites

1. **Prod data in your local DB.** The script reads from your local Postgres, so
   copy prod data down first — see
   [howto-access-deployment-database.md](../../docs/technical-design/howto-access-deployment-database.md).
2. **`DATABASE_URL` set** — exported automatically by `.envrc` / direnv (run
   `direnv allow` if needed).
3. **`psql`** on your PATH and the **`openpyxl`** Python package
   (`pip3 install openpyxl`).

## Usage

```bash
cd scripts/dsnp-report

# All DSNP contracts, up to today -> ~/Documents/DSNP_Contracts_in_MC-Review.xlsx
./generate-dsnp-report

# Only contracts first submitted on/after a date
./generate-dsnp-report 2025-11-04

# Only contracts first submitted within a date range
./generate-dsnp-report 2025-11-04 2025-12-31

# Filter the date window on the latest submission instead of the initial one
./generate-dsnp-report 2025-11-04 --by latest

# Override the output path (combinable with dates)
./generate-dsnp-report -o ~/Downloads/DSNP_Contracts.xlsx
./generate-dsnp-report 2025-11-04 -o ~/Downloads/DSNP_Contracts.xlsx
```

Dates are `YYYY-MM-DD`. By default the window filters on each contract's
**initial** submission date; pass `--by latest` to filter on the **latest**
submission instead. With no date, the report includes every DSNP contract.

## Output location

By default the report is written to
`~/Documents/DSNP_Contracts_in_MC-Review.xlsx` (your Mac's Documents folder),
overwriting any previous run. Pass `-o <path>` to write somewhere else. On
success the script prints the full path it wrote, e.g.:

```
Wrote 81 DSNP contract(s) -> /Users/you/Documents/DSNP_Contracts_in_MC-Review.xlsx
```

## Files

- `generate-dsnp-report` — the command to run (bash wrapper)
- `dsnp_contracts.sql` — the extraction query
- `generate_dsnp_spreadsheet.py` — runs the query, builds contract names from
  `statePrograms.json`, and writes the `.xlsx`

> Contract names aren't stored in the database — program short-names live in
> `packages/submissions/src/statePrograms/statePrograms.json`. The Python script
> resolves them, mirroring the app's `packageName()` logic.
