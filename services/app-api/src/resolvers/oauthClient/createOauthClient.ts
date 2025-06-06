import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { ForbiddenError } from 'apollo-server-core'

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        if (!user || user.role !== 'ADMIN_USER') {
            throw new ForbiddenError(
                'Only ADMIN users can create OAuth clients'
            )
        }
        // Store in DB (store function now generates credentials)
        const oauthClient = await store.createOAuthClient({
            grants: input.grants ?? undefined,
            description: input.description ?? undefined,
            contactEmail: input.contactEmail ?? undefined,
        })
        if (oauthClient instanceof Error) {
            throw oauthClient
        }
        return { oauthClient }
    }
}
