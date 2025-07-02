import type { MutationResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { ForbiddenError, UserInputError } from 'apollo-server-core'
import { GraphQLError } from 'graphql'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import {
    canWrite,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'

export function createOauthClientResolver(
    store: Store
): MutationResolvers['createOauthClient'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createOauthClient', {}, ctx)
        setResolverDetailsOnActiveSpan('createOauthClient', user, span)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = `OAuth client ${authInfo.clientId} does not have write permissions`
            logError('createOauthClient', errMessage)
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
            logError('createOauthClient', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        // Validate that the provided userID exists and is a valid CMS user
        const targetUser = await store.findUser(input.userID)
        if (targetUser instanceof Error) {
            logError('createOauthClient', targetUser.message)
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
            logError('createOauthClient', msg)
            setErrorAttributesOnActiveSpan(msg, span)
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
            const msg = `OAuth clients can only be associated with CMS users`
            logError('createOauthClient', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg, { argumentName: 'userID' })
        }

        const oauthClient = await store.createOAuthClient({
            grants: input.grants ?? undefined,
            description: input.description ?? undefined,
            userID: input.userID,
        })

        if (oauthClient instanceof Error) {
            logError('createOauthClient', oauthClient.message)
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
