import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { Context } from '../../handlers/apollo_gql'
import { logResolverError, logResolverSuccess } from '../../logger'
import { createForbiddenError } from '../errorUtils'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../oauth/oauthAuthorization'

export function deleteOauthClientResolver(
    store: Store
): MutationResolvers['deleteOauthClient'] {
    return async (
        _parent: unknown,
        { input }: { input: { clientId: string } },
        context: Context
    ) => {
        const { user } = context

        return withResolverSpan(
            context,
            'deleteOauthClient',
            { 'oauth.client_id': input.clientId },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('deleteOauthClient', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!user || user.role !== 'ADMIN_USER') {
                    const message =
                        'user not authorized to delete OAuth clients'
                    logResolverError('deleteOauthClient', message, context)
                    throw createForbiddenError(message)
                }

                // Delete from DB
                const deleted = await store.deleteOAuthClient(input.clientId)
                if (!deleted || deleted instanceof Error) {
                    const message = `Failed to delete OAuth client. ${deleted.message}`
                    logResolverError('deleteOauthClient', message, context)
                    throw new GraphQLError(message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('deleteOauthClient', context)

                return {
                    oauthClient: deleted,
                }
            }
        )
    }
}
