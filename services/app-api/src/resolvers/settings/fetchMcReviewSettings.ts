import type { Store } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { logError, logSuccess } from '../../logger'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
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
                logSuccess('fetchMcReviewSettings')

                if (context.oauthClient) {
                    const oauthErr =
                        'oauth clients cannot access this functionality'
                    logError('fetchMcReviewSettings', oauthErr)
                    throw createForbiddenError(oauthErr)
                }

                if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
                    const msg =
                        'user not authorized to fetch mc review settings'
                    logError('fetchMcReviewSettings', msg)
                    throw createForbiddenError(msg)
                }

                const config = emailer.config
                const stateAssignments = await store.findAllSupportedStates()

                if (stateAssignments instanceof Error) {
                    const msg = `Issue finding stateAssignments: ${stateAssignments.message}`
                    logError('fetchMcReviewSettings', msg)
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
