import type { ValidationStatusQuery } from '../../../../gen/gqlClient'

type ValidationStatus = ValidationStatusQuery['validationStatus']

interface Args {
    validationStatus?: ValidationStatus
}

export function shouldTriggerAIValidation({ validationStatus }: Args): boolean {
    if (!validationStatus) {
        return false
    }

    if (validationStatus.isStale) {
        return true
    }

    switch (validationStatus.stage) {
        case 'not-started':
            return true
        case 'parsing':
        case 'retrieving':
        case 'deterministic-validation':
        case 'llm-validation':
        case 'complete':
        case 'failed':
        default:
            return false
    }
}
