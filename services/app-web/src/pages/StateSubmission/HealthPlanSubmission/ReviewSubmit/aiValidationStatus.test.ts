import { describe, expect, it } from 'vitest'
import { getAIValidationDisplayState } from './aiValidationStatus'

describe('getAIValidationDisplayState', () => {
    it('returns a neutral non-polling fallback when validation times out', () => {
        expect(
            getAIValidationDisplayState({
                stage: 'retrieving',
                hasTimedOut: true,
            })
        ).toEqual({
            title: 'Document review still in progress',
            message:
                'Document review is still in progress. You can continue reviewing your submission and submit without waiting for these results.',
            alertType: 'warning',
            isPolling: false,
        })
    })

    it('keeps completed results non-polling when no timeout applies', () => {
        expect(
            getAIValidationDisplayState({
                stage: 'complete',
            })
        ).toEqual({
            title: 'Document review complete',
            message:
                'We finished comparing the submission dates with the uploaded documents.',
            alertType: 'success',
            isPolling: false,
        })
    })

    it('uses limited-coverage wording when completed results are partial', () => {
        expect(
            getAIValidationDisplayState({
                stage: 'complete',
                isPartialCoverage: true,
            })
        ).toEqual({
            title: 'Document review complete with limited coverage',
            message:
                'We finished comparing the submission dates with the uploaded documents we could review. Some uploaded documents could not be fully reviewed.',
            alertType: 'success',
            isPolling: false,
        })
    })
})
