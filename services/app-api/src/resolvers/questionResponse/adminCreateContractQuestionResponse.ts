import type { MutationResolvers } from '../../gen/gqlServer'
import { isAdminUser, isStateUser } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import {
    NotFoundError,
    UserInputPostgresError,
    type Store,
} from '../../postgres'
import { GraphQLError } from 'graphql'
import { canWrite } from '../../oauth/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'
import { isAdminQuestionResponseAllowedStatus } from '@mc-review/constants'

// Lets an AdminUser record a response on behalf of the state, attached to any
// existing contract question (including questions authored by CMS). No
// notification emails are sent.
export function adminCreateContractQuestionResponseResolver(
    store: Store
): MutationResolvers['adminCreateContractQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'adminCreateContractQuestionResponse',
            { 'question.id': input.questionID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'adminCreateContractQuestionResponse',
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

                if (!isAdminUser(user)) {
                    const msg =
                        'user not authorized to create an admin question response'
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        msg,
                        context
                    )
                    throw createForbiddenError(msg)
                }

                if (input.documents.length === 0) {
                    const msg = 'question response documents are required'
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                if (!input.reason.trim()) {
                    const msg = 'a reason is required'
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                if (input.createdAt && new Date(input.createdAt) > new Date()) {
                    const msg = 'the response date cannot be in the future'
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        msg,
                        context
                    )
                    throw createUserInputError(msg)
                }

                const question = await store.findContractQuestion(
                    input.questionID
                )
                if (question instanceof Error) {
                    if (question instanceof NotFoundError) {
                        const errMessage = `Contract question with ID: ${input.questionID} not found to attach response to`
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            errMessage,
                            context
                        )
                        throw createUserInputError(errMessage)
                    }

                    const errMessage = `Issue finding contract question ${input.questionID}. Message: ${question.message}`
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                const contract = await store.findContractWithHistory(
                    question.contractID
                )
                if (contract instanceof Error) {
                    if (contract instanceof NotFoundError) {
                        const errMessage = `Package with id ${question.contractID} does not exist`
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: { code: 'NOT_FOUND' },
                        })
                    }

                    const errMessage = `Issue finding a package. Message: ${contract.message}`
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (
                    !isAdminQuestionResponseAllowedStatus(
                        contract.consolidatedStatus
                    )
                ) {
                    const errMessage = `Issue creating response for contract. Message: Cannot create response for contract in ${contract.consolidatedStatus} status`
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                // Attribute the response to the chosen state user, or to the
                // admin when none is selected.
                let addedByUserID: string = user.id
                if (input.addedByUserID) {
                    const stateUser = await store.findUser(input.addedByUserID)
                    if (stateUser instanceof Error) {
                        const errMessage = `Issue finding user ${input.addedByUserID}. Message: ${stateUser.message}`
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }
                    if (!stateUser) {
                        const msg = `state user with id ${input.addedByUserID} does not exist`
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                    if (!isStateUser(stateUser)) {
                        const msg = 'addedByUserID must reference a state user'
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            msg,
                            context
                        )
                        throw createUserInputError(msg)
                    }
                    addedByUserID = stateUser.id
                }

                const docs = parseAndValidateDocuments(
                    input.documents.map((d) => ({
                        name: d.name,
                        s3URL: d.s3URL,
                    }))
                )

                const createResponseResult =
                    await store.insertAdminContractQuestionResponse({
                        questionID: input.questionID,
                        addedByUserID,
                        createdByAdminID: user.id,
                        reason: input.reason,
                        createdAt: input.createdAt
                            ? new Date(input.createdAt)
                            : undefined,
                        documents: docs,
                    })

                if (createResponseResult instanceof Error) {
                    if (createResponseResult instanceof NotFoundError) {
                        const errMessage = `Contract question with ID: ${input.questionID} not found to attach response to`
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            errMessage,
                            context
                        )
                        throw createUserInputError(errMessage)
                    }

                    if (
                        createResponseResult instanceof UserInputPostgresError
                    ) {
                        logResolverError(
                            'adminCreateContractQuestionResponse',
                            createResponseResult.message,
                            context
                        )
                        throw createUserInputError(createResponseResult.message)
                    }

                    const errMessage = `Issue creating admin question response for contract question ${input.questionID}. Message: ${createResponseResult.message}`
                    logResolverError(
                        'adminCreateContractQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new Error(errMessage)
                }

                // No notification emails are sent for admin-created responses.

                logResolverSuccess(
                    'adminCreateContractQuestionResponse',
                    context
                )

                return {
                    question: createResponseResult,
                }
            }
        )
    }
}
