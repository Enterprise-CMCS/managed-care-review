/**
 * Generate a CSV of DSNP contracts straight from the tested data layer.
 *
 * Reuses the same Store + domain model the resolvers (and therefore the web/CMS
 * apps) use, plus the real packageName() helper -- so the output stays in parity
 * with the app instead of re-encoding business rules in SQL.
 *
 * A contract is included if its latest submitted revision has dsnpContract=true.
 * All fields are read from that latest submission. Contracts that have never
 * been submitted are excluded.
 */
import { writeFileSync } from 'node:fs'
import { NewPrismaClient, NewPostgresStore } from '../postgres'
import {
    packageName,
    findStatePrograms,
    typedStatePrograms,
} from '@mc-review/submissions'
import type { ContractType } from '../domain-models'
import { resolveInitiallySubmittedAtOverride } from '../resolvers/shared/overrideHelpers'
import { latestDate } from '../resolvers/helpers'

export type Basis = 'initial' | 'latest'

export interface ReportOptions {
    from?: string
    to?: string
    by: Basis
    out: string
}

const HEADERS = [
    'Contract Name',
    'State',
    'contractID',
    'federalAuthorities',
    'rateMedicaidPopulations',
    'dsnpContract',
    'Initial Submission Date',
    'Latest Submission Date',
]

// Enum display order, matching the prior report.
const POP_ORDER = [
    'MEDICARE_MEDICAID_WITH_DSNP',
    'MEDICAID_ONLY',
    'MEDICARE_MEDICAID_WITHOUT_DSNP',
]

const STATE_NAMES = new Map(
    typedStatePrograms.states.map((s) => [s.code, s.name])
)

const ymd = (d: Date): string => d.toISOString().slice(0, 10)

function csvField(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

interface Row {
    name: string
    state: string
    contractID: string
    federalAuthorities: string
    rateMedicaidPopulations: string
    dsnp: boolean
    initialDate: string
    latestDate: string
}

function toRow(contract: ContractType): Row {
    const subs = contract.packageSubmissions
    const latest = subs[0]
    const initial = subs[subs.length - 1]
    const formData = latest.contractRevision.formData

    const pops = new Set<string>()
    for (const rate of latest.rateRevisions) {
        for (const p of rate.formData.rateMedicaidPopulations ?? []) pops.add(p)
    }

    return {
        name: packageName(
            contract.stateCode,
            contract.stateNumber,
            formData.programIDs,
            findStatePrograms(contract.stateCode)
        ),
        state: STATE_NAMES.get(contract.stateCode) ?? contract.stateCode,
        contractID: contract.id,
        federalAuthorities: (formData.federalAuthorities ?? []).join(','),
        rateMedicaidPopulations: POP_ORDER.filter((p) => pops.has(p)).join(','),
        dsnp: formData.dsnpContract === true,
        initialDate: ymd(
            resolveInitiallySubmittedAtOverride(
                initial.submitInfo.updatedAt,
                contract.contractOverrides
            )
        ),
        latestDate: ymd(
            latestDate([
                latest.submitInfo.updatedAt,
                ...(contract.reviewStatusActions ?? []).map(
                    (a) => a.updatedAt
                ),
            ]) ?? latest.submitInfo.updatedAt
        ),
    }
}

function inWindow(row: Row, opts: ReportOptions): boolean {
    const date = opts.by === 'latest' ? row.latestDate : row.initialDate
    if (opts.from && date < opts.from) return false
    if (opts.to && date > opts.to) return false
    return true
}

/** Build options from env vars (how the vitest entry passes config). */
export function optionsFromEnv(): ReportOptions {
    const from = process.env.DSNP_FROM || undefined
    const to = process.env.DSNP_TO || undefined
    const by = process.env.DSNP_BY === 'latest' ? 'latest' : 'initial'
    const out =
        process.env.DSNP_OUT ||
        `${process.env.HOME}/Documents/DSNP_Contracts.csv`

    for (const d of [from, to]) {
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            throw new Error(`'${d}' is not a valid YYYY-MM-DD date`)
        }
    }
    if (from && to && to < from) {
        throw new Error(`DSNP_TO ${to} is before DSNP_FROM ${from}`)
    }
    return { from, to, by, out }
}

/** Query, filter, and write the CSV. Returns the number of contracts written. */
export async function generateDsnpReport(opts: ReportOptions): Promise<number> {
    const dbURL = process.env.DATABASE_URL
    if (!dbURL) throw new Error('DATABASE_URL is not set')

    const client = await NewPrismaClient(dbURL)
    if (client instanceof Error) throw client
    const store = NewPostgresStore(client)

    const result = await store.findAllContractsWithHistoryBySubmitInfo()
    if (result instanceof Error) throw result

    const rows = result
        // drop contracts that failed to parse, keep only submitted DSNP ones
        .map((entry) => entry.contract)
        .filter((c): c is ContractType => !(c instanceof Error))
        .filter((c) => c.packageSubmissions.length > 0)
        .map(toRow)
        .filter((row) => row.dsnp)
        .filter((row) => inWindow(row, opts))
        .sort((a, b) => a.name.localeCompare(b.name))

    const lines = [
        HEADERS.join(','),
        ...rows.map((r) =>
            [
                r.name,
                r.state,
                r.contractID,
                r.federalAuthorities,
                r.rateMedicaidPopulations,
                String(r.dsnp),
                r.initialDate,
                r.latestDate,
            ]
                .map(csvField)
                .join(',')
        ),
    ]
    writeFileSync(opts.out, lines.join('\n') + '\n')
    return rows.length
}
