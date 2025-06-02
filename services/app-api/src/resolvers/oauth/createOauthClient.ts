import { ForbiddenError, UserInputError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { v4 as uuidv4 } from 'uuid'
import { hasAdminPermissions } from '../../domain-models/user'
import { createOAuthClient } from '../../postgres/oauth/oauthClientStore'
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from '../attributeHelper'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
// TODO: Replace 'any' with generated input/context types when available

export function createOauthClientResolver(store: Store): MutationResolvers['createOauthClient'] {
  return async (
    _parent: unknown,
    { input }: any,
    context: any
  ) => {
    const { user, ctx, tracer } = context
    const span = tracer?.startSpan('createOauthClient', {}, ctx)
    setResolverDetailsOnActiveSpan('createOauthClient', user, span)

    if (!hasAdminPermissions(user)) {
      setErrorAttributesOnActiveSpan('user not authorized to create oauth client', span)
      throw new ForbiddenError('user not authorized to create oauth client')
    }

    const clientId = uuidv4()
    const clientSecret = uuidv4()
    const { description, contactEmail, grants } = input

    // TEMP: Use sharedTestPrismaClient directly
    const prismaClient = await sharedTestPrismaClient()
    const result = await createOAuthClient(prismaClient, {
      clientId,
      clientSecret,
      description,
      contactEmail,
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