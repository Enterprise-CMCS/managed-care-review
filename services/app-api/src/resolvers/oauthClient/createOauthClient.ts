import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import { logResolverError, logResolverSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { canWrite } from '../../oauth/oauthAuthorization'
import { getAvailableOAuthScopesForUserRole } from '@mc-review/common-code'

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'createOauthClient',
            undefined,
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('createOauthClient', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!user || user.role !== 'ADMIN_USER') {
                    const msg = 'Only ADMIN users can create OAuth clients'
                    logResolverError('createOauthClient', msg, context)
                    throw createForbiddenError(msg)
                }

                // Validate that the provided userID exists and is eligible for OAuth association.
                const targetUser = await store.findUser(input.userID)
                if (targetUser instanceof Error) {
                    logResolverError(
                        'createOauthClient',
                        targetUser.message,
                        context
                    )
                    throw new GraphQLError(targetUser.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (!targetUser) {
                    const msg = `User with ID ${input.userID} does not exist`
                    logResolverError('createOauthClient', msg, context)
                    throw createUserInputError(
                        `User with ID ${input.userID} does not exist`,
                        'userID'
                    )
                }

                // Ensure the target user is a CMS, CMS approver, or admin user.
                if (
                    targetUser.role !== 'CMS_USER' &&
                    targetUser.role !== 'CMS_APPROVER_USER' &&
                    targetUser.role !== 'ADMIN_USER'
                ) {
                    const msg = `OAuth clients can only be associated with CMS or admin users`
                    logResolverError('createOauthClient', msg, context)
                    throw createUserInputError(msg, 'userID')
                }

                const availableScopes = getAvailableOAuthScopesForUserRole(
                    targetUser.role
                )
                if (
                    input.scopes?.some(
                        (scope) => !availableScopes.includes(scope)
                    )
                ) {
                    const msg = `OAuth scopes are not valid for the selected user role`
                    logResolverError('createOauthClient', msg, context)
                    throw createUserInputError(msg, 'scopes')
                }

                const oauthClient = await store.createOAuthClient({
                    grants: input.grants ?? undefined,
                    description: input.description ?? undefined,
                    scopes: input.scopes ?? undefined,
                    userID: input.userID,
                })

                if (oauthClient instanceof Error) {
                    logResolverError(
                        'createOauthClient',
                        oauthClient.message,
                        context
                    )
                    throw new GraphQLError(oauthClient.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('createOauthClient', context)

                return {
                    oauthClient,
                }
            }
        )
    }
}
