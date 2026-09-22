import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import type { Logger } from '../logger'
import {
    baselineLiteCounts,
    baselineLiteScenarioKey,
    buildBaselineLitePlan,
    type BaselineLitePlanItem,
} from '../planning/baselineLite'
import { runContractUnlockAddRateScenario } from './contractUnlockAddRate'
import { runContractUnlockResubmitScenario } from './contractUnlockResubmit'
import { submitSyntheticContract } from './submitContract'

export type BaselineLiteManifestEntry = {
    scenario: BaselineLitePlanItem['type']
    contractId: string
    status: 'SUBMITTED' | 'RESUBMITTED'
    marker: string
    rateIds: string[]
    sourceContractId?: string
}

export type BaselineLiteManifest = {
    scenarioKey: typeof baselineLiteScenarioKey
    seed: string
    expectedContractCount: number
    contractCount: number
    rateCount: number
    counts: typeof baselineLiteCounts
    contracts: BaselineLiteManifestEntry[]
}

type BaselineLiteOptions = {
    stateGraphql: GraphQLClient
    cmsGraphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
    onProgress?: (manifest: BaselineLiteManifest) => Promise<void>
}

type OwnedRateSource = {
    contractId: string
    rateId: string
}

function buildManifest(
    seed: string,
    expectedContractCount: number,
    contracts: ReadonlyArray<BaselineLiteManifestEntry>
): BaselineLiteManifest {
    const rateCount = new Set(contracts.flatMap((contract) => contract.rateIds))
        .size
    return {
        scenarioKey: baselineLiteScenarioKey,
        seed,
        expectedContractCount,
        contractCount: contracts.length,
        rateCount,
        counts: baselineLiteCounts,
        contracts: [...contracts],
    }
}

/**
 * Creates the fixed 100-contract QA handoff dataset in deterministic order.
 * It composes the existing API-backed scenario primitives rather than recreating
 * contract, rate, unlock, or submission behavior in the data service.
 */
export async function runBaselineLiteScenario({
    stateGraphql,
    cmsGraphql,
    uploads,
    logger,
    seed,
    onProgress,
}: BaselineLiteOptions): Promise<BaselineLiteManifest> {
    const plan = buildBaselineLitePlan(seed)
    const contracts: BaselineLiteManifestEntry[] = []
    const ownedRatePool = new Map<number, OwnedRateSource>()
    logger.info('synthetic.baseline-lite.started', {
        scenarioKey: baselineLiteScenarioKey,
        seed,
        expectedContractCount: plan.length,
        counts: baselineLiteCounts,
    })

    // Sequential execution keeps manifest order stable and avoids introducing a
    // second concurrency/retry system around the API client's existing retries.
    for (const item of plan) {
        let entry: BaselineLiteManifestEntry

        switch (item.type) {
            case 'contract-only': {
                const submitted = await submitSyntheticContract({
                    graphql: stateGraphql,
                    uploads,
                    marker: item.marker,
                    documentName: `synthetic-baseline-${item.seed}.pdf`,
                })
                entry = {
                    scenario: item.type,
                    contractId: submitted.contractId,
                    status: 'SUBMITTED',
                    marker: item.marker,
                    rateIds: [],
                }
                break
            }
            case 'owned-rate-source': {
                const submitted = await submitSyntheticContract({
                    graphql: stateGraphql,
                    uploads,
                    marker: item.marker,
                    documentName: `synthetic-baseline-${item.seed}-contract.pdf`,
                    rates: [
                        {
                            type: 'CREATE',
                            documentName: `synthetic-baseline-${item.seed}-rate.pdf`,
                        },
                    ],
                })
                const rateId = submitted.rateIds[0]
                if (!rateId || submitted.rateIds.length !== 1) {
                    throw new Error(
                        `Baseline rate source ${item.index} did not create one rate`
                    )
                }
                ownedRatePool.set(item.index, {
                    contractId: submitted.contractId,
                    rateId,
                })
                entry = {
                    scenario: item.type,
                    contractId: submitted.contractId,
                    status: 'SUBMITTED',
                    marker: item.marker,
                    rateIds: [rateId],
                }
                break
            }
            case 'linked-rate-target': {
                // Source items precede targets in the plan so every link points to
                // a rate that has already been submitted and is eligible to link.
                const source = ownedRatePool.get(item.sourceIndex)
                if (!source) {
                    throw new Error(
                        `Baseline linked target ${item.index} has no source rate`
                    )
                }
                const submitted = await submitSyntheticContract({
                    graphql: stateGraphql,
                    uploads,
                    marker: item.marker,
                    documentName: `synthetic-baseline-${item.seed}.pdf`,
                    rates: [{ type: 'LINK', rateId: source.rateId }],
                })
                entry = {
                    scenario: item.type,
                    contractId: submitted.contractId,
                    sourceContractId: source.contractId,
                    status: 'SUBMITTED',
                    marker: item.marker,
                    rateIds: [source.rateId],
                }
                break
            }
            case 'unlock-add-rate': {
                const result = await runContractUnlockAddRateScenario({
                    stateGraphql,
                    cmsGraphql,
                    uploads,
                    logger,
                    seed: item.seed,
                })
                entry = {
                    scenario: item.type,
                    contractId: result.contractId,
                    status: result.status,
                    marker: result.resubmittedMarker,
                    rateIds: [result.rateId],
                }
                break
            }
            case 'unlock-resubmit': {
                const result = await runContractUnlockResubmitScenario({
                    stateGraphql,
                    cmsGraphql,
                    uploads,
                    logger,
                    seed: item.seed,
                })
                entry = {
                    scenario: item.type,
                    contractId: result.contractId,
                    status: result.status,
                    marker: result.resubmittedMarker,
                    rateIds: [],
                }
                break
            }
        }

        contracts.push(entry)
        if (onProgress) {
            await onProgress(buildManifest(seed, plan.length, contracts))
        }
        if (contracts.length % 10 === 0 || contracts.length === plan.length) {
            logger.info('synthetic.baseline-lite.progress', {
                scenarioKey: baselineLiteScenarioKey,
                completedContractCount: contracts.length,
                expectedContractCount: plan.length,
                lastContractId: entry.contractId,
            })
        }
    }

    return buildManifest(seed, plan.length, contracts)
}
