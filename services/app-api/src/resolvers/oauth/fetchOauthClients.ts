import { ForbiddenError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { hasAdminPermissions } from '../../domain-models/user'
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from '../attributeHelper'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'

export function fetchOauthClientsResolver(store: Store): QueryResolvers['fetchOauthClients'] {
  return async (_parent, { input }, context) => {
    const { user, ctx, tracer } = context
    const span = tracer?.startSpan('fetchOauthClients', {}, ctx)
    setResolverDetailsOnActiveSpan('fetchOauthClients', user, span)

    if (!hasAdminPermissions(user)) {
      setErrorAttributesOnActiveSpan('user not authorized to fetch oauth clients', span)
      throw new ForbiddenError('user not authorized to fetch oauth clients')
    }

    let clients
    if (input && input.clientIds && input.clientIds.length > 0) {
      const foundClients = await Promise.all(
        input.clientIds.map(async (clientId: string) => {
          const result = await store.getOAuthClientByClientId(clientId)
          if (result instanceof Error) {
            setErrorAttributesOnActiveSpan(result.message, span)
            throw new GraphQLError('Failed to fetch OAuth client', {
              extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                cause: result.message,
              },
            })
          }
          return result
        })
      )
      clients = foundClients.filter((c) => c !== null)
    } else {
      const allClients = await store.listOauthClients()
      if (allClients instanceof Error) {
        setErrorAttributesOnActiveSpan(allClients.message, span)
        throw new GraphQLError('Failed to fetch OAuth clients', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            cause: allClients.message,
          },
        })
      }
      clients = allClients
    }

    setSuccessAttributesOnActiveSpan(span)
    const edges = clients.map((client) => ({ node: client }))
    return { totalCount: edges.length, edges }
  }
} 