import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { logResolverError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { isValidStateCode, type StateCodeType } from '@mc-review/submissions'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../oauth/oauthAuthorization'

export function updateStateAssignment(
    store: Store
): MutationResolvers['updateStateAssignment'] {
    return async (_parent, { input }, context) => {
        const { user: currentUser } = context

        return withResolverSpan(
            context,
            'updateStateAssignment',
            undefined,
            async (span) => {
                setResolverDetails(span, currentUser)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'updateStateAssignment',
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
                    logResolverError('updateStateAssignment', msg, context)
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
                        logResolverError(
                            'updateStateAssignment',
                            errMsg,
                            context
                        )
                        throw createUserInputError(
                            errMsg,
                            'stateAssignments',
                            invalidStateCodes
                        )
                    }
                } else {
                    const msg =
                        'cannot update state assignments with no assignments'
                    logResolverError('updateStateAssignment', msg, context)
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
                        logResolverError(
                            'updateStateAssignment',
                            errMsg,
                            context
                        )
                        throw createUserInputError(
                            errMsg,
                            'cmsUserID',
                            cmsUserID
                        )
                    }

                    const errMsg = `Issue assigning states to user. Message: ${result.message}`
                    logResolverError('updateStateAssignment', errMsg, context)
                    throw new GraphQLError(errMsg, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (!result) {
                    const errMsg = 'Failed to update user'
                    logResolverError('updateStateAssignment', errMsg, context)
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
        )
    }
}
