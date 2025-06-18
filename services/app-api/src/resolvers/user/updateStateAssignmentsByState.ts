import type { Store } from '../../postgres'
import { UserInputPostgresError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { logError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { isValidStateCode } from '@mc-review/hpp'
import { NotFoundError, handleNotFoundError, handleUserInputPostgresError } from '../../postgres'
import { GraphQLError } from 'graphql/index'

// Update cms users assigned to a specific state
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
            throw createForbiddenError(msg)
        }

        const { stateCode, assignedUsers } = input

        if (!isValidStateCode(stateCode)) {
            const errMsg = 'cannot update state assignments for invalid state'
            logError('updateStateAssignmentsByState', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createUserInputError(errMsg, 'stateCode')
        }

        if (assignedUsers.length === 0) {
            const msg = 'cannot update state assignments with no assignments'
            logError('updateStateAssignmentsByState', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg, 'assignedUsers')
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
                throw handleNotFoundError(result)
            }

            if (result instanceof UserInputPostgresError) {
                const errMsg = result.message
                logError('updateStateAssignmentsByState', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw handleUserInputPostgresError(result, 'assignedUsers')
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
