import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'

export function contractResolver(store: Store): Resolvers['Contract'] {
    return {
        initiallySubmittedAt(parent) {
            // we're only working on drafts for now, this will need to change to
            // look at the revisions when we expand
            return parent.draftRevision?.createdAt || null
        },
        state(parent) {
            const packageState = parent.stateCode
            const state = statePrograms.states.find(
                (st) => st.code === packageState
            )

            if (state === undefined) {
                const errMessage =
                    'State not found in database: ' + packageState
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
}
