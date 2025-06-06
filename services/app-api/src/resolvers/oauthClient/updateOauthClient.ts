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

export function updateOauthClientResolver(
    store: Store
): MutationResolvers['updateOauthClient'] {
    return async (
        _parent: unknown,
        {
            input,
        }: {
            input: {
                clientId: string
                description?: string | null
                contactEmail?: string | null
                grants?: string[] | null
            }
        },
        context: Context
    ) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('updateOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('updateOauthClient', user, span)

        if (!user || user.role !== 'ADMIN_USER') {
            const message = 'user not authorized to update OAuth clients'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        // Fetch the client
        const oauthClient = await store.getOAuthClientByClientId(input.clientId)
        if (!oauthClient || oauthClient instanceof Error) {
            const message = 'OAuth client not found'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new Error(message)
        }

        // Update the client
        const updated = await store.updateOAuthClient({
            id: oauthClient.id,
            description: input.description ?? undefined,
            contactEmail: input.contactEmail ?? undefined,
            grants: input.grants ?? undefined,
        })

        if (!updated || updated instanceof Error) {
            const message = 'Failed to update OAuth client'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new GraphQLError(message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('updateOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return { oauthClient: updated }
    }
}
