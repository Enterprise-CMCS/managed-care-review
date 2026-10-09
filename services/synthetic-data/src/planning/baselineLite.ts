export const baselineLiteScenarioKey = 'baseline-lite-v1'
export const baselineLiteManifestFileName = 'synthetic-baseline-manifest.json'

export const baselineLiteCounts = {
    contractOnly: 40,
    ownedRateSource: 10,
    linkedRateTarget: 20,
    unlockAddRate: 20,
    unlockResubmit: 10,
} as const

export type BaselineLitePlanItem =
    | { type: 'contract-only'; index: number; seed: string; marker: string }
    | { type: 'owned-rate-source'; index: number; seed: string; marker: string }
    | {
          type: 'linked-rate-target'
          index: number
          sourceIndex: number
          seed: string
          marker: string
      }
    | { type: 'unlock-add-rate'; index: number; seed: string }
    | { type: 'unlock-resubmit'; index: number; seed: string }

function itemSeed(seed: string, type: string, index: number): string {
    return `${seed}-${type}-${index.toString().padStart(3, '0')}`
}

function itemMarker(seed: string, type: string, index: number): string {
    return `[SYNTHETIC:${baselineLiteScenarioKey}:${type}:${seed}:${index.toString().padStart(3, '0')}]`
}

/**
 * Defines the small, fixed QA handoff dataset. Linked targets are assigned
 * round-robin so every pool rate belongs to its parent plus two linked contracts.
 */
export function buildBaselineLitePlan(seed: string): BaselineLitePlanItem[] {
    const plan: BaselineLitePlanItem[] = []

    for (let index = 1; index <= baselineLiteCounts.contractOnly; index++) {
        plan.push({
            type: 'contract-only',
            index,
            seed: itemSeed(seed, 'contract-only', index),
            marker: itemMarker(seed, 'contract-only', index),
        })
    }
    for (let index = 1; index <= baselineLiteCounts.ownedRateSource; index++) {
        plan.push({
            type: 'owned-rate-source',
            index,
            seed: itemSeed(seed, 'owned-rate-source', index),
            marker: itemMarker(seed, 'owned-rate-source', index),
        })
    }
    for (let index = 1; index <= baselineLiteCounts.linkedRateTarget; index++) {
        plan.push({
            type: 'linked-rate-target',
            index,
            sourceIndex: ((index - 1) % baselineLiteCounts.ownedRateSource) + 1,
            seed: itemSeed(seed, 'linked-rate-target', index),
            marker: itemMarker(seed, 'linked-rate-target', index),
        })
    }
    for (let index = 1; index <= baselineLiteCounts.unlockAddRate; index++) {
        plan.push({
            type: 'unlock-add-rate',
            index,
            seed: itemSeed(seed, 'unlock-add-rate', index),
        })
    }
    for (let index = 1; index <= baselineLiteCounts.unlockResubmit; index++) {
        plan.push({
            type: 'unlock-resubmit',
            index,
            seed: itemSeed(seed, 'unlock-resubmit', index),
        })
    }

    return plan
}
