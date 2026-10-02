import { describe, expect, it } from 'vitest'
import {
    baselineLiteCounts,
    buildBaselineLitePlan,
} from '../src/planning/baselineLite'

describe('buildBaselineLitePlan', () => {
    it('builds the fixed 100-contract handoff profile with shared rates', () => {
        const plan = buildBaselineLitePlan('qa-handoff')
        const counts = Object.fromEntries(
            Object.keys(baselineLiteCounts).map((key) => [key, 0])
        ) as Record<keyof typeof baselineLiteCounts, number>
        const planKeyByType = {
            'contract-only': 'contractOnly',
            'owned-rate-source': 'ownedRateSource',
            'linked-rate-target': 'linkedRateTarget',
            'unlock-add-rate': 'unlockAddRate',
            'unlock-resubmit': 'unlockResubmit',
        } as const

        for (const item of plan) {
            counts[planKeyByType[item.type]]++
        }
        expect(plan).toHaveLength(100)
        expect(counts).toEqual(baselineLiteCounts)
        expect(new Set(plan.map((item) => item.seed)).size).toBe(plan.length)

        const linksBySource = new Map<number, number>()
        for (const item of plan) {
            if (item.type === 'linked-rate-target') {
                linksBySource.set(
                    item.sourceIndex,
                    (linksBySource.get(item.sourceIndex) ?? 0) + 1
                )
            }
        }
        expect([...linksBySource.values()]).toEqual(
            Array.from({ length: baselineLiteCounts.ownedRateSource }, () => 2)
        )
    })
})
