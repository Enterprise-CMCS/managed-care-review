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

export function deleteOauthClientResolver(
    store: Store
): MutationResolvers['deleteOauthClient'] {
    return async (
        _parent: unknown,
        { input }: { input: { id?: string; clientId?: string } },
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
        // Must provide id or clientId
        if (!input.id && !input.clientId) {
            throw new Error('Must provide id or clientId')
        }
        // Fetch the client
        let oauthClient
        if (input.id) {
            oauthClient = await store.getOAuthClientById(input.id)
        } else if (input.clientId) {
            oauthClient = await store.getOAuthClientByClientId(input.clientId)
        }
        if (!oauthClient || oauthClient instanceof Error) {
            throw new Error('OAuth client not found')
        }
        // Delete from DB
        const deleted = await store.deleteOAuthClient(oauthClient.id)
        if (!deleted || deleted instanceof Error) {
            throw new Error('Failed to delete OAuth client')
        }

        logSuccess('deleteOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return { oauthClient: deleted }
    }
}
