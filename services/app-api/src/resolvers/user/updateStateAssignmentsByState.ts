import type { Store } from '../../postgres'
import { UserInputPostgresError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { logResolverError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { isValidStateCode } from '@mc-review/submissions'
import {
    NotFoundError,
    handleNotFoundError,
    handleUserInputPostgresError,
} from '../../postgres'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'

// Update cms users assigned to a specific state
export function updateStateAssignmentsByState(
    store: Store
): MutationResolvers['updateStateAssignmentsByState'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser } = context

        return withResolverSpan(
            context,
            'updateStateAssignmentsByState',
            undefined,
            async (span) => {
                setResolverDetails(span, currentUser)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'updateStateAssignmentsByState',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                // Only Admin and all CMS users can call this resolver
                if (
                    !hasAdminPermissions(currentUser) &&
                    !hasCMSPermissions(currentUser)
                ) {
                    const msg = 'user not authorized to modify assignments'
                    logResolverError(
                        'updateStateAssignmentsByState',
                        msg,
                        context
                    )
                    throw createForbiddenError(msg)
                }

                const { stateCode, assignedUsers } = input

                if (!isValidStateCode(stateCode)) {
                    const errMsg =
                        'cannot update state assignments for invalid state'
                    logResolverError(
                        'updateStateAssignmentsByState',
                        errMsg,
                        context
                    )
                    throw createUserInputError(errMsg, 'stateCode', stateCode)
                }

                if (assignedUsers.length === 0) {
                    const msg =
                        'cannot update state assignments with no assignments'
                    logResolverError(
                        'updateStateAssignmentsByState',
                        msg,
                        context
                    )
                    throw createUserInputError(
                        msg,
                        'assignedUsers',
                        assignedUsers
                    )
                }

                const result = await store.updateStateAssignedUsers(
                    currentUser.id,
                    stateCode,
                    assignedUsers
                )

                if (result instanceof Error) {
                    if (result instanceof NotFoundError) {
                        const errMsg = 'state does not exist'
                        logResolverError(
                            'updateStateAssignmentsByState',
                            errMsg,
                            context
                        )
                        throw handleNotFoundError(result)
                    }

                    if (result instanceof UserInputPostgresError) {
                        const errMsg = result.message
                        logResolverError(
                            'updateStateAssignmentsByState',
                            errMsg,
                            context
                        )
                        throw handleUserInputPostgresError(
                            result,
                            'assignedUsers',
                            assignedUsers
                        )
                    }

                    const errMsg = `Issue assigning states to user. Message: ${result.message}`
                    logResolverError(
                        'updateStateAssignmentsByState',
                        errMsg,
                        context
                    )
                    throw new GraphQLError(errMsg, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                return {
                    stateCode,
                    assignedUsers: result,
                }
            }
        )
    }
}
