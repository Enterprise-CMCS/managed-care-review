import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes } from 'crypto'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'

/**
 * Generates a secure OAuth clientId and clientSecret.
 * - clientId: uuid-based, prefixed with 'oauth-client-'
 * - clientSecret: 64 random bytes, base64url encoded
 * - grants: defaults to ['client_credentials'] if not provided
 */
async function callOauthLambdaToCreateCredentials(input: {
    grants?: string[]
    description?: string
    contactEmail?: string
}) {
    const clientId = `oauth-client-${uuidv4()}`
    // base64url encoding (no padding, URL-safe)
    const clientSecret = randomBytes(64).toString('base64url')
    const grants =
        input.grants && input.grants.length > 0
            ? input.grants
            : ['client_credentials']
    return {
        clientId,
        clientSecret,
        grants,
    }
}

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('createOauthClient', user, span)
        if (!user || user.role !== 'ADMIN_USER') {
            const msg = 'User not authorized to create OAuth clients'
            logError('createOauthClient', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }
        // Generate credentials
        const creds = await callOauthLambdaToCreateCredentials({
            grants: input.grants,
            description: input.description ?? undefined,
            contactEmail: input.contactEmail ?? undefined,
        })
        // Store in DB
        const oauthClient = await store.createOAuthClient({
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            grants: creds.grants,
            description: input.description ?? undefined,
            contactEmail: input.contactEmail ?? undefined,
        })
        if (oauthClient instanceof Error) {
            const errMessage = `Error creating Oauth client. Message: ${oauthClient.message}`
            logError('createOauthClient', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('createOauthClient')
        setSuccessAttributesOnActiveSpan(span)
        return { oauthClient }
    }
}
