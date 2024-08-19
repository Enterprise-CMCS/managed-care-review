import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { CMSUserType, UserType } from '../../domain-models'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import { isValidStateCode } from '../../common-code/healthPlanFormDataType'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'

// Only Admin users and DMCO CMS users can update state assignments
const hasUpdatePermissions = (user: UserType): boolean => {
    if (hasAdminPermissions(user)) {
        return true
    }

    if (hasCMSPermissions(user)) {
        const cmsUser = user as CMSUserType
        return cmsUser.divisionAssignment === 'DMCO'
    }

    return false
}

export function updateStateAssignments(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateStateAssignments'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, ctx, tracer } = context
        const span = tracer?.startSpan('updateStateAssignments', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'updateStateAssignments',
            currentUser,
            span
        )

        if (!hasUpdatePermissions(currentUser)) {
            const msg = 'user not authorized to modify assignments'
            logError('updateStateAssignments', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg, {
                code: 'FORBIDDEN',
                cause: 'NOT_AUTHORIZED',
            })
        }

        const { cmsUserID, stateAssignments } = input

        if (!stateAssignments || stateAssignments.length === 0) {
            const msg = 'cannot update state assignments with no assignments'
            logError('updateStateAssignments', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg, {
                argumentName: 'stateAssignments',
                argumentValues: stateAssignments,
                cause: 'INVALID_STATE_CODES',
            })
        }

        const stateAssignmentCodes: StateCodeType[] = []
        const invalidCodes = []
        let invalidStateCodes

        if (stateAssignments) {
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
                logError('updateStateAssignments', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'stateAssignments',
                    argumentValues: invalidStateCodes,
                    cause: 'INVALID_STATE_CODES',
                })
            }
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
                logError('updateStateAssignments', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'cmsUserID',
                    argumentValues: cmsUserID,
                    cause: 'CMSUSERID_NOT_EXIST',
                })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateStateAssignments', errMsg)
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
            logError('updateStateAssignments', errMsg)
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
