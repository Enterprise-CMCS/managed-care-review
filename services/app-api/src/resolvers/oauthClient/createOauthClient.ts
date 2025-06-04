import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes } from 'crypto'

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
        const { user } = context
        if (!user || user.role !== 'ADMIN_USER') {
            throw new Error(
                'Forbidden: Only ADMIN users can create OAuth clients'
            )
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
            throw oauthClient
        }
        return { oauthClient }
    }
}
