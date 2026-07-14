import type { Store } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { logResolverError, logResolverSuccess } from '../../logger'
import { hasReadPermissions } from '../../domain-models'
import { createForbiddenError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import type { Emailer } from '../../emailer'

export function fetchMcReviewSettings(
    store: Store,
    emailer: Emailer
): QueryResolvers['fetchMcReviewSettings'] {
    return async (_parent, _args, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchMcReviewSettings',
            undefined,
            async (span) => {
                setResolverDetails(span, user)
                logResolverSuccess('fetchMcReviewSettings', context)

                if (context.oauthClient) {
                    const oauthErr =
                        'oauth clients cannot access this functionality'
                    logResolverError('fetchMcReviewSettings', oauthErr, context)
                    throw createForbiddenError(oauthErr)
                }

                if (!hasReadPermissions(user)) {
                    const msg =
                        'user not authorized to fetch mc review settings'
                    logResolverError('fetchMcReviewSettings', msg, context)
                    throw createForbiddenError(msg)
                }

                const config = emailer.config
                const stateAssignments = await store.findAllSupportedStates()

                if (stateAssignments instanceof Error) {
                    const msg = `Issue finding stateAssignments: ${stateAssignments.message}`
                    logResolverError('fetchMcReviewSettings', msg, context)
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
        )
    }
}
