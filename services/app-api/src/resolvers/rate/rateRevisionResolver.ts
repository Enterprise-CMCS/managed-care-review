import type { Resolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError } from '../../logger'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'

export function rateRevisionResolver(store: Store): Resolvers['RateRevision'] {
    return {
        rate: async (parent, _args, context) => {
            const { ctx, tracer } = context
            const span = tracer?.startSpan('rateRevisionResolver.rate', {}, ctx)

            const rate = await store.findRateWithHistory(parent.rateID)
            if (rate instanceof Error) {
                const errMessage = `Issue finding rate with id: ${parent.rateID}. Message: ${rate.message}`
                logError('indexQuestions', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            return rate
        },
    }
}
