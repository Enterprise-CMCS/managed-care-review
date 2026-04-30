import { GraphQLError } from 'graphql'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models'
import { canRead } from '../../authorization/oauthAuthorization'
import { logError } from '../../logger'
import type { Context } from '../../handlers/apollo_gql'

export function assertCanAccessValidationContract(args: {
    operationName: 'triggerValidation' | 'validationStatus'
    context: Context
    stateCode: string
}): void {
    if (!canRead(args.context)) {
        const errMessage = 'OAuth client does not have read permissions'
        logError(args.operationName, errMessage)
        throw new GraphQLError(errMessage, {
            extensions: {
                code: 'FORBIDDEN',
                cause: 'INSUFFICIENT_OAUTH_GRANTS',
            },
        })
    }

    const { user, oauthClient } = args.context

    if (isStateUser(user)) {
        if (user.stateCode !== args.stateCode) {
            const errMessage = oauthClient
                ? `OAuth client not allowed to access contract from ${args.stateCode}`
                : `User from state ${user.stateCode} not allowed to access contract from ${args.stateCode}`
            logError(args.operationName, errMessage)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INVALID_STATE_REQUESTER',
                },
            })
        }

        return
    }

    if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
        const errMessage = 'User not allowed to access contract'
        logError(args.operationName, errMessage)
        throw new GraphQLError(errMessage, {
            extensions: {
                code: 'FORBIDDEN',
                cause: 'INVALID_STATE_REQUESTER',
            },
        })
    }
}
