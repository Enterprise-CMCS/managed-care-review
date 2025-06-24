import { ForbiddenError } from 'apollo-server-core'
import { logError, logSuccess } from '../../logger'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { mapPrismaUserToGraphQLUser } from './userMapping'

export function fetchOauthClientsResolver(
    store: Store
): QueryResolvers['fetchOauthClients'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchOauthClients', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchOauthClients', user, span)
        if (!user || user.role !== 'ADMIN_USER') {
            const msg = 'User not authorized to fetch OAuth clients'
            logError('fetchOauthClients', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }
        let oauthClients = []
        // If input is omitted or empty, fetch all
        if (!input || !input.clientIds || input.clientIds.length === 0) {
            const all = await store.listOAuthClients()
            if (all instanceof Error) {
                const errMessage = `Error fetching all OAuth clients. Message: ${all.message}`
                logError('fetchOauthClients', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            oauthClients = all
        } else {
            // Fetch by clientIds
            for (const clientId of input.clientIds) {
                const client = await store.getOAuthClientByClientId(clientId)
                if (client instanceof Error) {
                    const errMessage = `Error fetching OAuth client by clientId: ${clientId}. Message: ${client.message}`
                    logError('fetchOauthClients', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }
                if (client) oauthClients.push(client)
            }
            // Remove duplicates by id
            const seen = new Set()
            oauthClients = oauthClients.filter((c) => {
                if (seen.has(c.id)) return false
                seen.add(c.id)
                return true
            })
        }
        logSuccess('fetchOauthClients')
        setSuccessAttributesOnActiveSpan(span)
        return {
            oauthClients: oauthClients.map((client) => ({
                ...client,
                user: mapPrismaUserToGraphQLUser(client.user),
            })),
        }
    }
}
