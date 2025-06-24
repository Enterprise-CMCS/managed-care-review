import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { ForbiddenError, UserInputError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { mapPrismaUserToGraphQLUser } from './userMapping'

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

        // Validate that the provided userID exists and is a valid CMS user
        const targetUser = await store.findUser(input.userID)
        if (targetUser instanceof Error) {
            throw new UserInputError(
                `User with ID ${input.userID} does not exist`,
                { argumentName: 'userID' }
            )
        }

        if (!targetUser) {
            throw new UserInputError(
                `User with ID ${input.userID} does not exist`,
                { argumentName: 'userID' }
            )
        }

        // Ensure the target user is a CMS user (CMSUser or CMSApproverUser)
        if (
            targetUser.role !== 'CMS_USER' &&
            targetUser.role !== 'CMS_APPROVER_USER'
        ) {
            throw new UserInputError(
                `OAuth clients can only be associated with CMS users`,
                { argumentName: 'userID' }
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
        return {
            oauthClient: {
                ...oauthClient,
                user: mapPrismaUserToGraphQLUser(oauthClient.user),
            },
        }
    }
}
