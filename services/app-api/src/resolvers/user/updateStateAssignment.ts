import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { logError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import type { StateCodeType } from '@mc-review/hpp'
import { isValidStateCode } from '@mc-review/hpp'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'

export function updateStateAssignment(
    store: Store
): MutationResolvers['updateStateAssignment'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, ctx, tracer } = context
        const span = tracer?.startSpan('updateStateAssignment', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'updateStateAssignment',
            currentUser,
            span
        )

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('updateStateAssignment', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

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
            logError('updateStateAssignment', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        const { cmsUserID, stateAssignments } = input

        const stateAssignmentCodes: StateCodeType[] = []
        const invalidCodes = []
        let invalidStateCodes

        if (stateAssignments && stateAssignments.length > 0) {
            for (const assignment of stateAssignments) {
                if (isValidStateCode(assignment)) {
                    stateAssignmentCodes.push(assignment)
                } else {
                    invalidCodes.push(assignment)
                }
            }

            // check that the state codes are valid
            if (invalidCodes.length > 0) {
                invalidStateCodes = stateAssignments.filter(
                    (assignment) => !isValidStateCode(assignment)
                )

                const errMsg =
                    'cannot update state assignments with invalid assignments'
                logError('updateStateAssignment', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw createUserInputError(
                    errMsg,
                    'stateAssignments',
                    invalidStateCodes
                )
            }
        } else {
            const msg = 'cannot update state assignments with no assignments'
            logError('updateStateAssignment', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(
                msg,
                'stateAssignments',
                stateAssignments
            )
        }

        const result = await store.updateCmsUserProperties(
            cmsUserID,
            currentUser.id,
            stateAssignmentCodes,
            undefined,
            'Updated user state assignments'
        )

        if (result instanceof Error) {
            if (result instanceof NotFoundError) {
                const errMsg = 'cmsUserID does not exist'
                logError('updateStateAssignment', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw createUserInputError(errMsg, 'cmsUserID', cmsUserID)
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateStateAssignment', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new GraphQLError(errMsg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        if (!result) {
            const errMsg = 'Failed to update user'
            logError('updateStateAssignment', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new GraphQLError(errMsg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        return {
            user: result,
        }
    }
}
