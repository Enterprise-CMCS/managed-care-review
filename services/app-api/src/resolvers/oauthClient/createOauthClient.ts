import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { createForbiddenError } from '../errorUtils'

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        if (!user || user.role !== 'ADMIN_USER') {
            throw createForbiddenError(
                'Only ADMIN users can create OAuth clients'
            )
        }

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
