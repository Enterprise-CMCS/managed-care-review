import { ForbiddenError } from 'apollo-server-core'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'

export function fetchRateResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['fetchRate'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchRate', user, span)
        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        if (!ratesDatabaseRefactor) {
            throw new ForbiddenError(
                'fetchRate must be used with rates database refactor flag'
            )
        }

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

        setSuccessAttributesOnActiveSpan(span)
        return { rate: rateWithHistory }
    }
}
