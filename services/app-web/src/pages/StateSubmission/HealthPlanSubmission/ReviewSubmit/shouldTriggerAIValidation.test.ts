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

    it('returns true for not-started', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    __typename: 'ValidationStatusPayload',
                    stage: 'not-started',
                    artifactVersion: 'v1',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(true)
    })

    it('returns true for stale results', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    __typename: 'ValidationStatusPayload',
                    stage: 'complete',
                    artifactVersion: 'v1',
                    isStale: true,
                    error: null,
                    results: [],
                },
            })
        ).toBe(true)
    })

    it('returns false for retrieval in progress', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    __typename: 'ValidationStatusPayload',
                    stage: 'retrieving',
                    artifactVersion: 'v1',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(false)
    })

    it('returns false for complete current results', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    __typename: 'ValidationStatusPayload',
                    stage: 'complete',
                    artifactVersion: 'v1',
                    isStale: false,
                    error: null,
                    results: [],
                },
            })
        ).toBe(false)
    })

    it('returns false for failed current results', () => {
        expect(
            shouldTriggerAIValidation({
                validationStatus: {
                    __typename: 'ValidationStatusPayload',
                    stage: 'failed',
                    artifactVersion: 'v1',
                    isStale: false,
                    error: 'pipeline failed',
                    results: [],
                },
            })
        ).toBe(false)
    })
})
