import { describe, expect, it } from 'vitest'
import { shouldTriggerAIValidation } from './shouldTriggerAIValidation'

describe('shouldTriggerAIValidation', () => {
    it('returns false when validationStatus is missing', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: undefined,
            })
        ).toBe(false)
    })

    it('returns true for stale results', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    stage: 'complete',
                    artifactVersion: 'artifact-version',
                    isStale: true,
                    error: null,
                    results: [],
                },
            })
        ).toBe(true)
    })

    it('returns true when validation has not started', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    stage: 'not-started',
                    artifactVersion: 'artifact-version',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(true)
    })

    it('returns false when validation is already in progress', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    stage: 'retrieving',
                    artifactVersion: 'artifact-version',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(false)
    })

    it('returns false when validation is already complete', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    stage: 'complete',
                    artifactVersion: 'artifact-version',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(false)
    })
})
