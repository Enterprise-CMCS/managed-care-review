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

export function updateOauthClientResolver(
    store: Store
): MutationResolvers['updateOauthClient'] {
    return async (_parent: unknown, { input }, context: Context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('updateOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('updateOauthClient', user, span)

        if (!user || user.role !== 'ADMIN_USER') {
            const message = 'user not authorized to update OAuth clients'
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw createForbiddenError(message)
        }

        // Build update data object with only provided fields
        const updateData: {
            description?: string
            contactEmail?: string
            grants?: string[]
        } = {}

        if (input.description) {
            updateData.description = input.description
        }
        if (input.contactEmail) {
            updateData.contactEmail = input.contactEmail
        }
        if (input.grants && input.grants.length > 0) {
            updateData.grants = input.grants
        }

        // Update the client
        const updated = await store.updateOAuthClient(
            input.clientId,
            updateData
        )

        if (updated instanceof Error) {
            const message = `Failed to update OAuth client: ${updated.message}`
            logError('updateOauthClient', message)
            setErrorAttributesOnActiveSpan(message, span)

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

        logSuccess('updateOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return { oauthClient: updated }
    }
}
