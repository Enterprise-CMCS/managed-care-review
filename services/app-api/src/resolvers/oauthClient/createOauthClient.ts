import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import { logError, logSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { canWrite } from '../../authorization/oauthAuthorization'

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
                    logError('createOauthClient', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!user || user.role !== 'ADMIN_USER') {
                    const msg = 'Only ADMIN users can create OAuth clients'
                    logError('createOauthClient', msg)
                    throw createForbiddenError(msg)
                }

                // Validate that the provided userID exists and is a valid CMS user
                const targetUser = await store.findUser(input.userID)
                if (targetUser instanceof Error) {
                    logError('createOauthClient', targetUser.message)
                    throw new GraphQLError(targetUser.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (!targetUser) {
                    const msg = `User with ID ${input.userID} does not exist`
                    logError('createOauthClient', msg)
                    throw createUserInputError(
                        `User with ID ${input.userID} does not exist`,
                        'userID'
                    )
                }

                // Ensure the target user is a CMS user (CMSUser or CMSApproverUser)
                if (
                    targetUser.role !== 'CMS_USER' &&
                    targetUser.role !== 'CMS_APPROVER_USER'
                ) {
                    const msg = `OAuth clients can only be associated with CMS users`
                    logError('createOauthClient', msg)
                    throw createUserInputError(msg, 'userID')
                }

                const oauthClient = await store.createOAuthClient({
                    grants: input.grants ?? undefined,
                    description: input.description ?? undefined,
                    userID: input.userID,
                })

                if (oauthClient instanceof Error) {
                    logError('createOauthClient', oauthClient.message)
                    throw new GraphQLError(oauthClient.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logSuccess('createOauthClient')

                return {
                    oauthClient,
                }
            }
        )
    }
}
