import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers, State } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isStateUser } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError } from 'apollo-server-core'

export function fetchRateResolver(store: Store): QueryResolvers['fetchRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchRate', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchRate', user, span)

        const rateWithHistory = await store.findRateWithHistory(input.rateID)
        if (rateWithHistory instanceof Error) {
            const errMessage = `Issue finding rate message: ${rateWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (rateWithHistory instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (isStateUser(user)) {
            const stateForCurrentUser: State['code'] = user.stateCode
            if (rateWithHistory.stateCode !== stateForCurrentUser) {
                logError(
                    'fetchRate',
                    'State users are not authorized to fetch rate data from a different state.'
                )
                setErrorAttributesOnActiveSpan(
                    'State users are not authorized to fetch rate data from a different state.',
                    span
                )
                throw new ForbiddenError(
                    'State users are not authorized to fetch rate data from a different state.'
                )
            }
        }

        setSuccessAttributesOnActiveSpan(span)
        return { rate: rateWithHistory }
    }
}
