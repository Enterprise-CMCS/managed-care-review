import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison, hasAdminPermissions } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'

export function updateDivisionAssignment(
    store: Store
): MutationResolvers['updateDivisionAssignment'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser, ctx, tracer } = context
        const span = tracer?.startSpan('updateDivisionAssignment', {}, ctx)
        setResolverDetailsOnActiveSpan(
            'updateDivisionAssignment',
            currentUser,
            span
        )

        // This resolver is only callable by admin users
        if (!hasAdminPermissions(currentUser)) {
            logError(
                'updateDivisionAssignment',
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
        const { cmsUserID } = input
        let { divisionAssignment } = input
        if (divisionAssignment === null) {
            divisionAssignment = undefined
        }

        // validate division assignment and throw an error if invalid
        if (divisionAssignment) {
            if (!isValidCmsDivison(divisionAssignment)) {
                const errMsg = 'Invalid division assignment'
                logError('updateDivisionAssignment', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'divisionAssignment',
                    argumentValues: divisionAssignment,
                    cause: 'INVALID_DIVISION_ASSIGNMENT',
                })
            }
        }

        const result = await store.updateCmsUserProperties(
            cmsUserID,
            currentUser.id,
            undefined,
            divisionAssignment,
            'Updated user assignments' // someday might have a note field and make this a param
        )
        if (result instanceof Error) {
            if (result instanceof NotFoundError) {
                const errMsg = 'cmsUserID does not exist'
                logError('updateDivisionAssignment', errMsg)
                setErrorAttributesOnActiveSpan(errMsg, span)
                throw new UserInputError(errMsg, {
                    argumentName: 'cmsUserID',
                    argumentValues: cmsUserID,
                    cause: 'CMSUSERID_NOT_EXIST',
                })
            }

            const errMsg = `Issue assigning states to user. Message: ${result.message}`
            logError('updateDivisionAssignment', errMsg)
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
            logError('updateDivisionAssignment', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new GraphQLError(errMsg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('updateDivisionAssignment')

        // return updated user
        return {
            user: result,
        }
    }
}
