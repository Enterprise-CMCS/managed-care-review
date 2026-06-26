/**
 * Lambda handler to backfill ContractTable.lastActionDate and
 * RateTable.lastActionDate for existing rows.
 *
 * Usage:
 *   aws lambda invoke --function-name app-api-{stage}-backfill-last-action-date response.json
 *
 * With options:
 *   aws lambda invoke --function-name app-api-{stage}-backfill-last-action-date \
 *     --payload '{"entity":"contracts","dryRun":true}' response.json
 *
 * This migration intentionally only processes rows with a missing
 * lastActionDate. Draft-only contracts/rates are excluded because lastActionDate
 * should start when submitted data first exists.
 */

import type { Handler } from 'aws-lambda'
import { parseErrorToError } from '@mc-review/helpers'
import { getPostgresURL } from './configuration'
import {
    NewPrismaClient,
    type ExtendedPrismaClient,
} from '../postgres/prismaClient'
import {
    buildCompleteHistory,
    buildRateSubmissionHistory,
} from '../postgres/submissionHistoryHelpers'
import { findSubmissionHistoryByContractID } from '../postgres/contractAndRates'
import { findRateWithHistory } from '../postgres/contractAndRates/findRateWithHistory'
import { findRateQuestionResponseHistory } from '../postgres/questionResponse'

type BackfillEntity = 'contracts' | 'rates' | 'both'

export type BackfillLastActionDateEvent = {
    entity?: BackfillEntity
    dryRun?: boolean
}

type BackfillEntityResult = {
    processed: number
    updated: number
    skipped: number
    failed: number
    errors: string[]
}

export type BackfillLastActionDateResponse = {
    success: boolean
    dryRun: boolean
    entity: BackfillEntity
    results: {
        contracts?: BackfillEntityResult
        rates?: BackfillEntityResult
    }
}

export const main: Handler = async (
    event: BackfillLastActionDateEvent = {}
): Promise<BackfillLastActionDateResponse> => {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required')
    }

    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        throw new Error(`Init Error: failed to get pg URL: ${dbConnResult}`)
    }

    const prismaClientResult = await NewPrismaClient(dbConnResult)
    if (prismaClientResult instanceof Error) {
        throw new Error(
            `Init Error: failed to create Prisma client: ${prismaClientResult}`
        )
    }

    const prismaClient = prismaClientResult

    // Lambda payloads are untyped JSON. Normalize all inputs up front so the
    // contract and rate branches below can share the same batch helpers.
    const entity = event.entity ?? 'both'
    const dryRun = event.dryRun ?? false

    if (!['contracts', 'rates', 'both'].includes(entity)) {
        throw new Error(
            'Invalid entity. Expected one of: contracts, rates, both'
        )
    }

    console.info('Starting lastActionDate backfill', {
        entity,
        dryRun,
    })

    const response: BackfillLastActionDateResponse = {
        success: true,
        dryRun,
        entity,
        results: {},
    }

    if (entity === 'contracts' || entity === 'both') {
        response.results.contracts = await backfillContracts(prismaClient, {
            dryRun,
        })
    }

    if (entity === 'rates' || entity === 'both') {
        response.results.rates = await backfillRates(prismaClient, {
            dryRun,
        })
    }

    response.success =
        (response.results.contracts?.failed ?? 0) === 0 &&
        (response.results.rates?.failed ?? 0) === 0

    console.info('lastActionDate backfill complete', response)

    return response
}

async function backfillContracts(
    client: ExtendedPrismaClient,
    options: {
        dryRun: boolean
    }
): Promise<BackfillEntityResult> {
    const result: BackfillEntityResult = {
        processed: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    }

    // light-weight query to find which contracts needs to be migrated
    const contracts = await client.contractTable.findMany({
        where: {
            // Backfill is idempotent: only rows that have not yet been
            // populated are selected.
            lastActionDate: null,
            // DRAFT contracts have no submitted data yet. Skip them so their
            // first lastActionDate is set by the normal submit path.
            revisions: {
                some: {
                    submitInfoID: {
                        not: null,
                    },
                },
            },
        },
        orderBy: {
            id: 'asc',
        },
        select: {
            id: true,
        },
    })

    for (const contract of contracts) {
        result.processed++

        try {
            // Contract history is the canonical contract freshness source. It
            // includes direct contract actions plus contract-visible rate Q&A
            // and rate overrides filtered to the submitted attachment windows.
            const historyResult = await findSubmissionHistoryByContractID(
                client,
                contract.id
            )

            if (historyResult instanceof Error) {
                throw historyResult
            }

            const lastActionDate = historyResult.history[0]?.updatedAt

            if (!lastActionDate) {
                // This should be rare because the query requires a submitted
                // revision, but keep the migration tolerant of inconsistent
                // history data.
                result.skipped++
                continue
            }

            if (!options.dryRun) {
                await client.contractTable.update({
                    where: {
                        id: contract.id,
                    },
                    data: {
                        lastActionDate,
                    },
                })
            }

            result.updated++
        } catch (error) {
            const message = parseErrorToError(error).message
            result.failed++
            result.errors.push(`${contract.id}: ${message}`)
        }
    }

    return result
}

async function backfillRates(
    client: ExtendedPrismaClient,
    options: {
        dryRun: boolean
    }
): Promise<BackfillEntityResult> {
    const result: BackfillEntityResult = {
        processed: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    }

    const rates = await client.rateTable.findMany({
        where: {
            // Backfill is idempotent: only rows that have not yet been
            // populated are selected.
            lastActionDate: null,
            // A draft-only rate has no submitted rate data yet. Skip it for the
            // same reason we skip draft-only contracts.
            revisions: {
                some: {
                    submitInfoID: {
                        not: null,
                    },
                },
            },
        },
        orderBy: {
            id: 'asc',
        },
        select: {
            id: true,
        },
    })

    for (const rate of rates) {
        result.processed++

        try {
            // Rate submission history can be built from the parsed rate domain
            // object, which includes submitted package history, review actions,
            // unlocks, link/unlink relationship events, and overrides.
            const rateWithHistory = await findRateWithHistory(client, rate.id)

            if (rateWithHistory instanceof Error) {
                throw rateWithHistory
            }

            // Q&A is not part of findRateWithHistory. Fetch it separately so the
            // backfill matches the user-visible rate history/freshness rules.
            const questionHistory = await findRateQuestionResponseHistory(
                client,
                rate.id
            )

            if (questionHistory instanceof Error) {
                throw questionHistory
            }

            // Rate freshness is the latest material rate action. Combine the
            // rate submission builder with rate Q&A so backfilled rows align
            // with the same history sources used by live writes.
            const history = buildCompleteHistory([
                buildRateSubmissionHistory(rateWithHistory),
                questionHistory,
            ])
            const lastActionDate = history[0]?.updatedAt

            if (!lastActionDate) {
                // This should be rare because the query requires a submitted
                // revision, but keep the migration tolerant of inconsistent
                // history data.
                result.skipped++
                continue
            }

            if (!options.dryRun) {
                await client.rateTable.update({
                    where: {
                        id: rate.id,
                    },
                    data: {
                        lastActionDate,
                    },
                })
            }

            result.updated++
        } catch (error) {
            const message = parseErrorToError(error).message
            result.failed++
            result.errors.push(`${rate.id}: ${message}`)
        }
    }

    return result
}
