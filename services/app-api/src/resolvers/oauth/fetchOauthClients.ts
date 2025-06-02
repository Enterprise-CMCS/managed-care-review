import { ForbiddenError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { hasAdminPermissions } from '../../domain-models/user'
import { getOAuthClientByClientId, listOAuthClients } from '../../postgres/oauth/oauthClientStore'
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from '../attributeHelper'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
// TODO: Replace 'any' with generated input/context types when available

export function fetchOauthClientsResolver(store: Store): QueryResolvers['fetchOauthClients'] {
  return async (
    _parent: unknown,
    { input }: any,
    context: any
  ) => {
    const { user, ctx, tracer } = context
    const span = tracer?.startSpan('fetchOauthClients', {}, ctx)
    setResolverDetailsOnActiveSpan('fetchOauthClients', user, span)

    if (!hasAdminPermissions(user)) {
      setErrorAttributesOnActiveSpan('user not authorized to fetch oauth clients', span)
      throw new ForbiddenError('user not authorized to fetch oauth clients')
    }

    // TEMP: Use sharedTestPrismaClient directly
    const prismaClient = await sharedTestPrismaClient()
    let clients
    if (input && input.clientIds && input.clientIds.length > 0) {
      clients = await Promise.all(
        input.clientIds.map(async (clientId: string) => {
          const result = await getOAuthClientByClientId(prismaClient, clientId)
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
      clients = clients.filter((c) => c !== null)
    } else {
      clients = await listOAuthClients(prismaClient)
      if (clients instanceof Error) {
        setErrorAttributesOnActiveSpan(clients.message, span)
        throw new GraphQLError('Failed to fetch OAuth clients', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            cause: clients.message,
          },
        })
      }
    }

    setSuccessAttributesOnActiveSpan(span)
    const edges = clients.map((client: any) => ({ node: client }))
    return { totalCount: edges.length, edges }
  }
} 