import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import { isAdminUser, isValidCmsDivison } from '../../domain-models'
import type { StateCodeType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { isValidStateCode } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { isHelpdeskUser } from '../../domain-models/user'

export function updateCMSUserResolver(
    store: Store
): MutationResolvers['updateCMSUser'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, span } = context
        setResolverDetailsOnActiveSpan('updateCmsUser', currentUser, span)

        // This resolver is only callable by admin users
        if (!(isAdminUser(currentUser) || isHelpdeskUser(currentUser))) {
            logError(
                'updateHealthPlanFormData',
                'user not authorized to modify assignments'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to modify assignments',
                span
            )
            throw new ForbiddenError(
                'user not authorized to modify assignments',
                {
                    code: 'FORBIDDEN',
                    cause: 'NOT_ADMIN',
                }
            )
        }
        const { cmsUserID, stateAssignments } = input
        let { divisionAssignment } = input
        if (divisionAssignment === null) {
            divisionAssignment = undefined
        }

        if (!stateAssignments && !divisionAssignment) {
            const errMsg =
                'No state assignments or division assignment provided'
            logError('updateCmsUser', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg, {
                cause: 'NO_ASSIGNMENTS',
            })
        }

        // validate division assignment and throw an error if invalid
        if (divisionAssignment) {
            if (!isValidCmsDivison(divisionAssignment)) {
                const errMsg = 'Invalid division assignment'
                logError('updateCmsUser', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'divisionAssignment',
                    argumentValues: divisionAssignment,
                    cause: 'INVALID_DIVISION_ASSIGNMENT',
                })
            }
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

                const errMsg = 'Invalid state codes'
                logError('updateCmsUser', errMsg)
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
            stateAssignmentCodes,
            currentUser.id,
            divisionAssignment,
            'Updated user assignments' // someday might have a note field and make this a param
        )
        if (isStoreError(result)) {
            if (result.code === 'NOT_FOUND_ERROR') {
                const errMsg = 'cmsUserID does not exist'
                logError('updateCmsUser', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'cmsUserID',
                    argumentValues: cmsUserID,
                    cause: 'CMSUSERID_NOT_EXIST',
                })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateCmsUser', errMsg)
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
            logError('updateCmsUser', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new GraphQLError(errMsg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('updateCmsUser')

        // return updated user
        return {
            user: result,
        }
    }
}
