/**
 * Env-gated entry point for the DSNP report.
 *
 * This is NOT a unit test -- it's a report runner that lives under vitest because
 * importing the app's Store + domain layer (the tested code we want to reuse)
 * only resolves cleanly under the vite/vitest module resolver. It is skipped on
 * normal `vitest run` (so it never touches the DB in CI) and only does work when
 * DSNP_REPORT=1 is set.
 *
 * Don't run this directly. Use the positional wrapper, which sets DSNP_REPORT
 * and the DSNP_* option env vars this entry reads via optionsFromEnv():
 *   ./generate-dsnp-report 2025-11-04 --by latest -o ~/Downloads/dsnp.csv
 *
 * Or invoke the pnpm script and pass options as env vars yourself:
 *   DSNP_FROM=2025-11-04 DSNP_BY=latest pnpm --filter app-api generate-dsnp-report
 */
import { test } from 'vitest'
import { generateDsnpReport, optionsFromEnv } from './generateDsnpReport'

test.skipIf(!process.env.DSNP_REPORT)(
    'generate DSNP contracts report',
    async () => {
        const opts = optionsFromEnv()
        const count = await generateDsnpReport(opts)
        const window =
            opts.from && opts.to
                ? ` ${opts.by}-submitted ${opts.from} to ${opts.to}`
                : opts.from
                  ? ` ${opts.by}-submitted on/after ${opts.from}`
                  : ''
        // process.stdout.write (not console.log) so the summary survives the
        // wrapper's `vitest --silent`.
        process.stdout.write(
            `Wrote ${count} DSNP contract(s)${window} -> ${opts.out}\n`
        )
    },
    60000
)
