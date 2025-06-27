import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { Context } from '../../handlers/apollo_gql'
import { logSuccess, logError } from '../../logger'
import { ForbiddenError } from 'apollo-server-core'
import {
    setSuccessAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'

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

        if (!user || user.role !== 'ADMIN_USER') {
            const message = 'user not authorized to delete OAuth clients'
            logError('deleteOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
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
