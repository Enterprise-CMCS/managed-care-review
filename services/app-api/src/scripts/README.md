# DSNP contracts report

Generates a CSV of all DSNP contracts in MC-Review.

A contract is included if its **latest submitted revision** has
`dsnpContract = true`. Every field reflects that latest submission. Contracts
that have never been submitted are excluded.

Columns: `Contract Name`, `State`, `contractID`, `federalAuthorities`,
`rateMedicaidPopulations`, `dsnpContract`, `Initial Submission Date`,
`Latest Submission Date`.

## Why it runs through vitest

The report imports the app's `Store`/domain layer. Those `@mc-review/*` workspace
packages are built as CJS, and Node's ESM loader can't follow their re-exports
when run as a plain `tsx` script — only the vite/vitest module resolver handles
it. So the report is an **env-gated vitest entry** (`dsnpReport.test.ts`): a
normal `vitest run` skips it (it never touches the DB in CI), and it only does
work when `DSNP_REPORT=1` is set. The wrapper script sets that for you.

## Prerequisites

1. **Prod data in your local DB** — the report reads your local Postgres, so copy
   prod data down first. See
   [howto-access-deployment-database.md](../../../../docs/technical-design/howto-access-deployment-database.md).
2. **`DATABASE_URL` set** — exported automatically by `.envrc` / direnv (run
   `direnv allow` if needed).

## Usage

The wrapper gives a plain positional CLI:

```bash
cd services/app-api/src/scripts

./generate-dsnp-report                          # all DSNP contracts, up to today
./generate-dsnp-report 2025-11-04               # submitted on/after a date
./generate-dsnp-report 2025-11-04 2025-12-31    # within a date range
./generate-dsnp-report 2025-11-04 --by latest   # filter window on latest submission
./generate-dsnp-report -o ~/Downloads/dsnp.csv  # custom output path
```

Dates are `YYYY-MM-DD`. By default the window filters on each contract's
**initial** submission date; `--by latest` filters on the **latest** submission.


## Output location

Defaults to `~/Documents/DSNP_Contracts.csv`, overwriting any previous run. Pass
`-o <path>` to change it. The run prints the path it wrote:

```
Wrote 81 DSNP contract(s) -> /Users/you/Documents/DSNP_Contracts.csv
```

## Files

- `generate-dsnp-report` — positional-arg wrapper (the command you run)
- `dsnpReport.test.ts` — env-gated vitest entry that invokes the report
- `generateDsnpReport.ts` — the report logic (query via `Store`, extract from the
  domain model, write CSV)
