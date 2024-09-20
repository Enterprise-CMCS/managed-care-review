import type { Store } from '../../postgres'
import { UserInputPostgresError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { isValidStateCode } from '../../common-code/healthPlanFormDataType'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'

export function updateStateAssignmentsByState(
    store: Store
): MutationResolvers['updateStateAssignmentsByState'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, ctx, tracer } = context
        const span = tracer?.startSpan('updateStateAssignmentsByState', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'updateStateAssignmentsByState',
            currentUser,
            span
        )

        // Only Admin and all CMS users can call this resolver
        if (
            !hasAdminPermissions(currentUser) &&
            !hasCMSPermissions(currentUser)
        ) {
            const msg = 'user not authorized to modify assignments'
            logError('updateStateAssignmentsByState', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg, {
                cause: 'NOT_AUTHORIZED',
            })
        }

        const { stateCode, assignedUsers } = input

        if (!isValidStateCode(stateCode)) {
            const errMsg = 'cannot update state assignments for invalid state'
            logError('updateStateAssignmentsByState', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg, {
                argumentName: 'stateCode',
                argumentValues: stateCode,
                cause: 'INVALID_STATE_CODE',
            })
        }

        if (assignedUsers.length === 0) {
            const msg = 'cannot update state assignments with no assignments'
            logError('updateStateAssignmentsByState', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg, {
                argumentName: 'assignedUsers',
                argumentValues: assignedUsers,
                cause: 'NO_ASSIGNED_USERS',
            })
        }

        const result = await store.updateStateAssignedUsers(
            currentUser.id,
            stateCode,
            assignedUsers
        )

        if (result instanceof Error) {
            if (result instanceof NotFoundError) {
                const errMsg = 'state does not exist'
                logError('updateStateAssignmentsByState', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'stateCode',
                    argumentValues: stateCode,
                    cause: 'STATE_DOES_NOT_EXIST',
                })
            }

            if (result instanceof UserInputPostgresError) {
                const errMsg = result.message
                logError('updateStateAssignmentsByState', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'assignedUsers',
                    argumentValues: assignedUsers,
                    cause: 'USERS_ARE_NOT_STATE_USERS',
                })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateStateAssignmentsByState', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
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
}
