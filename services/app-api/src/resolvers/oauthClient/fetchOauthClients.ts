import { logResolverError, logResolverSuccess } from '../../logger'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { createForbiddenError } from '../errorUtils'

export function fetchOauthClientsResolver(
    store: Store
): QueryResolvers['fetchOauthClients'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchOauthClients',
            { 'mcreview.oauth_client_ids_count': input?.clientIds?.length ?? 0 },
            async (span) => {
                setResolverDetails(span, user)

                if (context.oauthClient) {
                    const oauthErr = 'oauth clients cannot access admin functions'
                    logResolverError('fetchOauthClients', oauthErr, context)
                    throw createForbiddenError(oauthErr)
                }

                if (!user || user.role !== 'ADMIN_USER') {
                    const msg = 'User not authorized to fetch OAuth clients'
                    logResolverError('fetchOauthClients', msg, context)
                    throw createForbiddenError(msg)
                }

                let oauthClients = []

                if (!input || !input.clientIds || input.clientIds.length === 0) {
                    const all = await store.listOAuthClients()
                    if (all instanceof Error) {
                        const errMessage = `Error fetching all OAuth clients. Message: ${all.message}`
                        logResolverError(
                            'fetchOauthClients',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }
                    oauthClients = all
                } else {
                    for (const clientId of input.clientIds) {
                        const client =
                            await store.getOAuthClientByClientId(clientId)
                        if (client instanceof Error) {
                            const errMessage = `Error fetching OAuth client by clientId: ${clientId}. Message: ${client.message}`
                            logResolverError(
                                'fetchOauthClients',
                                errMessage,
                                context
                            )
                            throw new GraphQLError(errMessage, {
                                extensions: {
                                    code: 'INTERNAL_SERVER_ERROR',
                                    cause: 'DB_ERROR',
                                },
                            })
                        }
                        if (client) oauthClients.push(client)
                    }

                    const seen = new Set()
                    oauthClients = oauthClients.filter((c) => {
                        if (seen.has(c.id)) return false
                        seen.add(c.id)
                        return true
                    })
                }
                logResolverSuccess('fetchOauthClients', context)
                return {
                    oauthClients,
                }
            }
        )
    }
}
