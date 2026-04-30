import type { RuntimeValidationWorkSelectionMode } from '../resolvers/validation/triggerValidation'

export function resolveValidationWorkSelectionMode(
    value: string | undefined
): RuntimeValidationWorkSelectionMode {
    // AIFA-050 promotes the evaluated gated-first-pass strategy into the
    // product runtime by default. AIFA-062 keeps the all-doc path available
    // because it is still the simplest whole-document baseline for debugging
    // and correctness comparison, not just a leftover rollout toggle.
    if (value == null || value.trim() === '') {
        return 'gated-first-pass'
    }

    const normalizedValue = value.trim().toLowerCase()

    if (
        normalizedValue === 'all-doc' ||
        normalizedValue === 'gated-first-pass'
    ) {
        return normalizedValue
    }

    throw new Error(
        `Configuration Error: AI_VALIDATION_WORK_SELECTION_MODE must be "all-doc" or "gated-first-pass". Current value: ${value}`
    )
}

export function describeValidationWorkSelectionMode(
    value: string | undefined
): string {
    const resolvedMode = resolveValidationWorkSelectionMode(value)

    if (value == null || value.trim() === '') {
        return `${resolvedMode} (default)`
    }

    return resolvedMode
}
