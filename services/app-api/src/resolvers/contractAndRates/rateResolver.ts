import statePrograms from 'app-web/src/common-code/data/statePrograms.json'
import type { Resolvers } from '../../gen/gqlServer'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models'

// Return the date of the first submission for a rate
// This method relies on revisions always being presented in most-recent-first order
function initialSubmitDate(rate: RateType): Date | undefined {
    const lastSubmittedRev = rate.revisions[rate.revisions.length - 1]
    return lastSubmittedRev?.submitInfo?.updatedAt
}

export const rateResolver: Resolvers['Rate'] = {
    initiallySubmittedAt(parent) {
        return initialSubmitDate(parent) || null
    },
    state(parent) {
        const packageState = parent.stateCode
        const state = statePrograms.states.find(
            (st) => st.code === packageState
        )

        if (state === undefined) {
            const errMessage = 'State not found in database: ' + packageState
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        return state
    },
}
