import { ForbiddenError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { hasAdminPermissions } from '../../domain-models/user'
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from '../attributeHelper'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'

export function createOauthClientResolver(store: Store): MutationResolvers['createOauthClient'] {
  return async (_parent, { input }, context) => {
    const { user, ctx, tracer } = context
    const span = tracer?.startSpan('createOauthClient', {}, ctx)
    setResolverDetailsOnActiveSpan('createOauthClient', user, span)

    if (!hasAdminPermissions(user)) {
      setErrorAttributesOnActiveSpan('user not authorized to create oauth client', span)
      throw new ForbiddenError('user not authorized to create oauth client')
    }

    // Only pass description, contactEmail, and optionally grants
    const { description, contactEmail, grants } = input
    const result = await store.createOauthClient({
      description: description ?? undefined,
      contactEmail: contactEmail ?? undefined,
      grants,
    })

    if (result instanceof Error) {
      setErrorAttributesOnActiveSpan(result.message, span)
      throw new GraphQLError('Failed to create OAuth client', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          cause: result.message,
        },
      })
    }

    setSuccessAttributesOnActiveSpan(span)
    return { oauthClient: result }
  }
} 