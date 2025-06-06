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

export function updateOauthClientResolver(
    store: Store
): MutationResolvers['updateOauthClient'] {
    return async (
        _parent: unknown,
        {
            input,
        }: {
            input: {
                id: string
                description?: string
                contactEmail?: string
                grants?: string[]
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
        const oauthClient = await store.getOAuthClientById(input.id)
        if (!oauthClient || oauthClient instanceof Error) {
            const message = 'OAuth client not found'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new Error(message)
        }

        // Update the client
        const updated = await store.updateOAuthClient({
            id: input.id,
            description: input.description,
            contactEmail: input.contactEmail,
            grants: input.grants,
        })

        if (!updated || updated instanceof Error) {
            const message = 'Failed to update OAuth client'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new Error(message)
        }

        logSuccess('updateOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return { oauthClient: updated }
    }
}
