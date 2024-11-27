import type { Resolvers } from '../../gen/gqlServer'

export function rateFormDataResolver(): Resolvers['RateFormData'] {
    return {
        consolidatedRateProgramIDs: async (parent) => {
            if (parent.rateProgramIDs && parent.rateProgramIDs.length > 0) {
                return parent.rateProgramIDs
            } else if (
                parent.deprecatedRateProgramIDs &&
                parent.deprecatedRateProgramIDs.length > 0
            ) {
                return parent.deprecatedRateProgramIDs
            } else {
                return []
            }
        },
    }
}
