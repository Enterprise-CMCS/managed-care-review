import type {
    ContractDataOverrideType,
    RateDataOverrideType,
} from '../../domain-models/contractAndRates/contractRateOverrideTypes'

type InitiallySubmittedAtOverride =
    | ContractDataOverrideType
    | RateDataOverrideType

/**
 * Resolves the effective initiallySubmittedAt value for GraphQL resolvers.
 *
 * Contract and rate domain objects expose override history separately from the
 * computed date, so field resolvers apply those override rows at read time.
 */
function resolveInitiallySubmittedAtOverride(
    baseValue: Date,
    overrides?: InitiallySubmittedAtOverride[]
): Date {
    if (!overrides) {
        return baseValue
    }

    let effective = baseValue
    for (const override of [...overrides].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )) {
        const op = override.overrides.initiallySubmittedAtOp
        if (op === 'CLEAR_OVERRIDE') {
            effective = baseValue
        } else if (
            op === 'OVERRIDE' &&
            override.overrides.initiallySubmittedAt
        ) {
            effective = override.overrides.initiallySubmittedAt
        }
    }

    return effective
}

export { resolveInitiallySubmittedAtOverride }
