import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { Context } from '../../handlers/apollo_gql'
import { logSuccess, logError } from '../../logger'
import { createForbiddenError } from '../errorUtils'
import {
    setSuccessAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../authorization/oauthAuthorization'

export function deleteOauthClientResolver(
    store: Store
): MutationResolvers['deleteOauthClient'] {
    return async (
        _parent: unknown,
        { input }: { input: { clientId: string } },
        context: Context
    ) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('deleteOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('deleteOauthClient', user, span)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('deleteOauthClient', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!user || user.role !== 'ADMIN_USER') {
            const message = 'user not authorized to delete OAuth clients'
            logError('deleteOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw createForbiddenError(message)
        }

        // Delete from DB
        const deleted = await store.deleteOAuthClient(input.clientId)
        if (!deleted || deleted instanceof Error) {
            const message = 'Failed to delete OAuth client'
            logError('deleteOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('deleteOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return {
            oauthClient: deleted,
        }
    }
}
