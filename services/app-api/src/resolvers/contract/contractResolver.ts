import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { Resolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'

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

        draftRevision(parent) {
            return parent.draftRevision || {}
        },
        draftRates: async (parent, _args, context) => {
            const { span } = context
            const rateDataArray = parent.draftRevision?.rateRevisions || []

            return rateDataArray.map(async (rateData) => {
                if (rateData.formData.rateID === undefined) {
                    const errMessage = `rateID on ${rateData.id} is undefined`
                    logError('fetchContract', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                const rateResult = await store.findRateWithHistory(
                    rateData.formData.rateID
                )

                if (rateResult instanceof Error) {
                    const errMessage = `Could not find rate with id: ${rateData.id}. Message: ${rateResult.message}`
                    logError('fetchContract', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }
                return rateResult
            })
        },
        // not yet implemented, currently only working on drafts:
        packageSubmissions() {
            return []
        },
    }
}
