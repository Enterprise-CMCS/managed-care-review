import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison, hasAdminPermissions } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { canWrite } from '../../authorization/oauthAuthorization'

export function updateDivisionAssignment(
    store: Store
): MutationResolvers['updateDivisionAssignment'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser } = context

        return withResolverSpan(
            context,
            'updateDivisionAssignment',
            undefined,
            async (span) => {
                setResolverDetails(span, currentUser)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logError('updateDivisionAssignment', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                // This resolver is only callable by admin users
                if (!hasAdminPermissions(currentUser)) {
                    const errMessage =
                        'user not authorized to modify assignments'
                    logError('updateDivisionAssignment', errMessage)
                    throw createForbiddenError(errMessage)
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
                        throw createUserInputError(
                            errMsg,
                            'divisionAssignment',
                            divisionAssignment
                        )
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
                        throw createUserInputError(
                            errMsg,
                            'cmsUserID',
                            cmsUserID
                        )
                    }

                    const errMsg = `Issue assigning states to user. Message: ${result.message}`
                    logError('updateDivisionAssignment', errMsg)
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
        )
    }
}
