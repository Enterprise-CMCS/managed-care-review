import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { Context } from '../../handlers/apollo_gql'
import type { OAuthScope } from '../../generated/enums'
import { logResolverError, logResolverSuccess } from '../../logger'
import { createForbiddenError } from '../errorUtils'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../authorization/oauthAuthorization'

export function updateOauthClientResolver(
    store: Store
): MutationResolvers['updateOauthClient'] {
    return async (_parent: unknown, { input }, context: Context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'updateOauthClient',
            { 'oauth.client_id': input.clientId },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('updateOauthClient', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!user || user.role !== 'ADMIN_USER') {
                    const message =
                        'user not authorized to update OAuth clients'
                    logResolverError('updateOauthClient', message, context)
                    throw createForbiddenError(message)
                }

                // Build update data object with only provided fields
                const updateData: {
                    description?: string
                    grants?: string[]
                    scopes?: OAuthScope[]
                } = {}

                if (input.description) {
                    updateData.description = input.description
                }
                if (input.grants && input.grants.length > 0) {
                    updateData.grants = input.grants
                }
                if (input.scopes && input.scopes.length > 0) {
                    updateData.scopes = input.scopes
                }

                // Update the client
                const updated = await store.updateOAuthClient(
                    input.clientId,
                    updateData
                )

                if (updated instanceof Error) {
                    const message = `Failed to update OAuth client: ${updated.message}`
                    logResolverError('updateOauthClient', message, context)

                    // Check if this is a "not found" error
                    if (updated.message.includes('not found')) {
                        throw new GraphQLError('OAuth client not found', {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'CLIENT_NOT_FOUND',
                            },
                        })
                    }

                    throw new GraphQLError(message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('updateOauthClient', context)

                return {
                    oauthClient: updated,
                }
            }
        )
    }
}
