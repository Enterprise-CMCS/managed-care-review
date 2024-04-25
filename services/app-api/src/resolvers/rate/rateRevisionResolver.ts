import type { Resolvers } from '../../gen/gqlServer'

export const rateRevisionResolver: Resolvers['RateRevision'] = {
    contractRevisions(parent) {
        return parent.contractRevisions || []
    },
}
