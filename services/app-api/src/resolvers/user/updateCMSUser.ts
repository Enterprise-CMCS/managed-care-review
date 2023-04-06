import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isAdminUser, isValidCmsDivison } from '../../domain-models'
import {
    isValidStateCode,
    StateCodeType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { isStoreError, Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'

export function updateCMSUserResolver(
    store: Store
): MutationResolvers['updateCMSUser'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, span } = context
        setResolverDetailsOnActiveSpan('updateCmsUser', currentUser, span)

        // This resolver is only callable by admin users
        if (!isAdminUser(currentUser)) {
            logError(
                'updateHealthPlanFormData',
                'user not authorized to modify state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to modify state data',
                span
            )
            throw new ForbiddenError(
                'user not authorized to modify assignments',
                { extensions: { code: 'FORBIDDEN', cause: 'USER_NOT_ADMIN' } }
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
                extensions: {
                    code: 'BAD_USER_INPUT',
                    cause: 'NO_ASSIGNMENTS_PROVIDED',
                },
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
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        cause: 'INVALID_DIVISION_ASSIGNMENT',
                    },
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
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        cause: 'INVALID_STATE_CODES',
                    },
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
            if (result.code === 'INSERT_ERROR') {
                const errMsg = 'cmsUserID does not exist'
                logError('updateCmsUser', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'cmsUserID',
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        cause: 'CMSUSERID_NOT_EXIST',
                    },
                })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateCmsUser', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new Error(errMsg)
        }
        if (!result) {
            const errMsg = 'Failed to update user'
            logError('updateCmsUser', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new Error(errMsg)
        }

        logSuccess('updateCmsUser')

        // return updated user
        return {
            user: result,
        }
    }
}
