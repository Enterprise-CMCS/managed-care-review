import { describe, expect, it } from 'vitest'
import { SeededRandom } from '../src/planning/seededRandom'

describe('SeededRandom', () => {
    it('produces the same plan choices for the same seed', () => {
        const first = new SeededRandom('baseline-v1-seed')
        const second = new SeededRandom('baseline-v1-seed')

        const firstPlan = Array.from({ length: 20 }, () => ({
            submissionType: first.pick([
                'CONTRACT_ONLY',
                'CONTRACT_AND_RATES',
            ]),
            rateCount: first.integer(0, 8),
        }))
        const secondPlan = Array.from({ length: 20 }, () => ({
            submissionType: second.pick([
                'CONTRACT_ONLY',
                'CONTRACT_AND_RATES',
            ]),
            rateCount: second.integer(0, 8),
        }))

        expect(firstPlan).toEqual(secondPlan)
    })

    it('keeps inclusive integer choices inside configured bounds', () => {
        const random = new SeededRandom(42)
        const values = Array.from({ length: 1_000 }, () =>
            random.integer(2, 5)
        )

        expect(Math.min(...values)).toBe(2)
        expect(Math.max(...values)).toBe(5)
    })
})
