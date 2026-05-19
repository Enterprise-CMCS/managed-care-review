import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import { logResolverError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { canWrite } from '../../authorization/oauthAuthorization'

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('createOauthClient', user, span)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logResolverError('createOauthClient', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!user || user.role !== 'ADMIN_USER') {
            const msg = 'Only ADMIN users can create OAuth clients'
            logResolverError('createOauthClient', msg, context)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        // Validate that the provided userID exists and is a valid CMS user
        const targetUser = await store.findUser(input.userID)
        if (targetUser instanceof Error) {
            logResolverError('createOauthClient', targetUser.message, context)
            setErrorAttributesOnActiveSpan(targetUser.message, span)
            throw new GraphQLError(targetUser.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (!targetUser) {
            const msg = `User with ID ${input.userID} does not exist`
            logResolverError('createOauthClient', msg, context)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(
                `User with ID ${input.userID} does not exist`,
                'userID'
            )
        }

        // Ensure the target user is a CMS user (CMSUser or CMSApproverUser)
        if (
            targetUser.role !== 'CMS_USER' &&
            targetUser.role !== 'CMS_APPROVER_USER'
        ) {
            const msg = `OAuth clients can only be associated with CMS users`
            logResolverError('createOauthClient', msg, context)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg, 'userID')
        }

        const oauthClient = await store.createOAuthClient({
            grants: input.grants ?? undefined,
            description: input.description ?? undefined,
            scopes: input.scopes ?? undefined,
            userID: input.userID,
        })

        if (oauthClient instanceof Error) {
            logResolverError('createOauthClient', oauthClient.message, context)
            setErrorAttributesOnActiveSpan(oauthClient.message, span)
            throw new GraphQLError(oauthClient.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('createOauthClient')
        setSuccessAttributesOnActiveSpan(span)

        return {
            oauthClient,
        }
    }
}
