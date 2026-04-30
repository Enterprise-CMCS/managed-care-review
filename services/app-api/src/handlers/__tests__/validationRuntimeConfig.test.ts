import { describe, expect, test } from 'vitest'
import {
    describeValidationWorkSelectionMode,
    resolveValidationWorkSelectionMode,
} from '../validationRuntimeConfig'

describe('validation runtime config', () => {
    test('defaults work selection mode to gated-first-pass', () => {
        expect(resolveValidationWorkSelectionMode(undefined)).toBe(
            'gated-first-pass'
        )
        expect(describeValidationWorkSelectionMode(undefined)).toBe(
            'gated-first-pass (default)'
        )
    })

    test('accepts explicit supported work selection overrides', () => {
        expect(resolveValidationWorkSelectionMode(' all-doc ')).toBe('all-doc')
        expect(describeValidationWorkSelectionMode('gated-first-pass')).toBe(
            'gated-first-pass'
        )
    })

    test('rejects unsupported work selection overrides', () => {
        expect(() => resolveValidationWorkSelectionMode('fallback')).toThrow(
            /AI_VALIDATION_WORK_SELECTION_MODE must be "all-doc" or "gated-first-pass"/
        )
    })
})
