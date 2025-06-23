import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'

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

        // Validate that the provided userID exists and is a valid user
        const targetUser = await store.findUser(input.userID)
        if (targetUser instanceof Error) {
            throw createUserInputError(
                `User with ID ${input.userID} does not exist`,
                'userID'
            )
        }

        const oauthClient = await store.createOAuthClient({
            grants: input.grants ?? undefined,
            description: input.description ?? undefined,
            userID: input.userID,
        })
        if (oauthClient instanceof Error) {
            throw new GraphQLError(oauthClient.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        return { oauthClient }
    }
}
