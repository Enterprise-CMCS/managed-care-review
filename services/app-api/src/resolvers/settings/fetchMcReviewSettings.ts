import type { Store } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { logError, logSuccess } from '../../logger'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { ForbiddenError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import type { Emailer } from '../../emailer'

export function fetchMcReviewSettings(
    store: Store,
    emailer: Emailer
): QueryResolvers['fetchMcReviewSettings'] {
    return async (_parent, _args, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchMcReviewSettings', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchMcReviewSettings', user, span)
        setSuccessAttributesOnActiveSpan(span)
        logSuccess('fetchMcReviewSettings')

        if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
            const msg = 'user not authorized to fetch mc review settings'
            logError('fetchMcReviewSettings', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg, {
                cause: 'NOT_AUTHORIZED',
            })
        }

        // First get emailer config
        const config = emailer.config

        const stateAssignments = await store.findAllSupportedStates()

        if (stateAssignments instanceof Error) {
            const msg = `Issue finding stateAssignments: ${stateAssignments.message}`
            logError('fetchMcReviewSettings', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new GraphQLError(msg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        return {
            emailConfiguration: config,
            stateAssignments: stateAssignments,
        }
    }
}
