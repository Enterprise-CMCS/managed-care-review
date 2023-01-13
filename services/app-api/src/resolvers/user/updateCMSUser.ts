import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isAdminUser } from '../../domain-models'
import {
    isValidStateCode,
    StateCodeType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { MutationResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
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
        setResolverDetailsOnActiveSpan(
            'updateStateAssignments',
            currentUser,
            span
        )

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
                'user not authorized to modify state assignments'
            )
        }

        const { cmsUserID, stateAssignments } = input

        const stateAssignmentCodes: StateCodeType[] = []
        const invalidCodes = []

        for (const assignment of stateAssignments) {
            if (isValidStateCode(assignment)) {
                stateAssignmentCodes.push(assignment)
            } else {
                invalidCodes.push(assignment)
            }
        }

        // check that the state codes are valid
        if (invalidCodes.length > 0) {
            const invalidStateCodes = stateAssignments.filter(
                (assignment) => !isValidStateCode(assignment)
            )

            const errMsg = 'Invalid state codes'
            logError('updateStateAssignments', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new UserInputError(errMsg, {
                argumentName: 'stateAssignments',
                argumentValues: invalidStateCodes,
            })
        }

        const result = await store.updateUserAssignedState(
            cmsUserID,
            stateAssignmentCodes
        )
        if (isStoreError(result)) {
            if (result.code === 'INSERT_ERROR') {
                const errMsg = 'cmsUserID does not exist'
                logError('updateStateAssignments', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, { argumentName: 'cmsUserID' })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateStateAssignments', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new Error(errMsg)
        }

        // return updated user
        return {
            user: result,
        }
    }
}
