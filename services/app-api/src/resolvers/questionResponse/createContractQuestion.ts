import type { MutationResolvers } from '../../gen/gqlServer'
import { contractSubmitters, hasCMSPermissions } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import {
    NotFoundError,
    OPEN_QUESTION_ROUND_ERROR_MESSAGE,
    UserInputPostgresError,
    handleUserInputPostgresError,
    type Store,
} from '../../postgres'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison } from '../../domain-models'
import type { Emailer } from '../../emailer'
import { canOauthWrite } from '../../oauth/oauthAuthorization'
import type { StateCodeType } from '@mc-review/submissions'
import { parseAndValidateDocuments } from '../documentHelpers'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function createContractQuestionResolver(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService
): MutationResolvers['createContractQuestion'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'createContractQuestion',
            { 'contract.id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })

                // Check OAuth client write permissions
                if (!canOauthWrite(context, featureFlags)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'createContractQuestion',
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

                if (!hasCMSPermissions(user)) {
                    const msg = 'user not authorized to create a question'
                    logResolverError('createContractQuestion', msg, context)
                    throw createForbiddenError(msg)
                }

                if (
                    !user.divisionAssignment ||
                    (user.divisionAssignment &&
                        !isValidCmsDivison(user.divisionAssignment))
                ) {
                    const msg =
                        'users without an assigned division are not authorized to create a question'
                    logResolverError('createContractQuestion', msg, context)
                    throw createForbiddenError(msg)
                }

                if (input.documents.length === 0) {
                    const msg = 'question documents are required'
                    logResolverError('createContractQuestion', msg, context)
                    throw createUserInputError(msg)
                }

                // Return error if package is not found or errors
                const contractResult = await store.findContractWithHistory(
                    input.contractID
                )
                if (contractResult instanceof Error) {
                    if (contractResult instanceof NotFoundError) {
                        const errMessage = `Package with id ${input.contractID} does not exist`
                        logResolverError(
                            'createContractQuestion',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: { code: 'NOT_FOUND' },
                        })
                    }

                    const errMessage = `Issue finding a package. Message: ${contractResult.message}`
                    logResolverError(
                        'createContractQuestion',
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
                    contractResult.contractSubmissionType === 'EQRO' &&
                    user.divisionAssignment !== 'DMCO'
                ) {
                    const msg =
                        'only users assigned to the DMCO division are authorized to create EQRO contract questions'
                    logResolverError('createContractQuestion', msg, context)
                    throw createForbiddenError(msg)
                }

                // Return error if contract status is DRAFT, contract will have no submitted revisions
                // Return error if contract has been approved
                if (
                    contractResult.revisions.length === 0 ||
                    contractResult.consolidatedStatus === 'APPROVED'
                ) {
                    const errMessage = `Issue creating question for contract. Message: Cannot create question for contract in ${contractResult.consolidatedStatus} status`
                    logResolverError(
                        'createContractQuestion',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage)
                }

                const statePrograms = store.findStatePrograms(
                    contractResult.stateCode
                )
                const submitterEmails = contractSubmitters(contractResult)

                if (statePrograms instanceof Error) {
                    logResolverError(
                        'findStatePrograms',
                        statePrograms.message,
                        context
                    )
                    throw new GraphQLError(statePrograms.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                const allQuestions = await store.findAllQuestionsByContract(
                    contractResult.id
                )
                if (allQuestions instanceof Error) {
                    const errMessage = `Issue finding all questions associated with the contract: ${contractResult.id}`
                    logResolverError(
                        'createContractQuestion',
                        errMessage,
                        context
                    )
                    throw new Error(errMessage)
                }

                // Do not allow a new question to be created while a previous
                // question round is still open. A round is open when any
                // existing question has not yet received a response.
                const hasOpenQuestionRound = allQuestions.some(
                    (question) => question.responses.length === 0
                )
                if (hasOpenQuestionRound) {
                    logResolverError(
                        'createContractQuestion',
                        OPEN_QUESTION_ROUND_ERROR_MESSAGE,
                        context
                    )
                    throw createUserInputError(
                        OPEN_QUESTION_ROUND_ERROR_MESSAGE
                    )
                }

                // Parse and validate document s3URLs at API boundary
                const docs = parseAndValidateDocuments(
                    input.documents.map((d) => ({
                        name: d.name,
                        s3URL: d.s3URL,
                    }))
                )

                const inputFormatted = {
                    ...input,
                    documents: docs,
                }
                const questionResult = await store.insertContractQuestion(
                    inputFormatted,
                    user
                )

                if (questionResult instanceof Error) {
                    // The store re-checks for an open question round inside a
                    // row-locked transaction; a request that loses a concurrent
                    // race is rejected here with a BAD_USER_INPUT error.
                    if (questionResult instanceof UserInputPostgresError) {
                        logResolverError(
                            'createContractQuestion',
                            questionResult.message,
                            context
                        )
                        throw handleUserInputPostgresError(questionResult)
                    }

                    const errMessage = `Issue creating question for package. Message: ${questionResult.message}`
                    logResolverError(
                        'createContractQuestion',
                        errMessage,
                        context
                    )
                    throw new Error(errMessage)
                }

                allQuestions.push(questionResult)

                const sendQuestionsStateEmailResult =
                    await emailer.sendQuestionsStateEmail(
                        contractResult.revisions[0],
                        contractResult.contractSubmissionType,
                        submitterEmails,
                        statePrograms,
                        questionResult
                    )

                if (sendQuestionsStateEmailResult instanceof Error) {
                    logResolverError(
                        'sendQuestionsStateEmail - state email failed',
                        sendQuestionsStateEmailResult,
                        context
                    )
                    const errMessage = `Error sending a state email for
                questionID: ${questionResult.id} and contractID: ${contractResult.id}`
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                let stateAnalystsEmails: string[] = []
                // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
                const stateAnalystsEmailsResult =
                    await store.findStateAssignedUsers(
                        contractResult.stateCode as StateCodeType
                    )

                if (stateAnalystsEmailsResult instanceof Error) {
                    logResolverError(
                        'getStateAnalystsEmails',
                        stateAnalystsEmailsResult.message,
                        context
                    )
                } else {
                    stateAnalystsEmails = stateAnalystsEmailsResult.map(
                        (u) => u.email
                    )
                }

                const sendQuestionsCMSEmailResult =
                    await emailer.sendQuestionsCMSEmail(
                        contractResult.revisions[0],
                        contractResult.contractSubmissionType,
                        stateAnalystsEmails,
                        statePrograms,
                        allQuestions
                    )

                if (sendQuestionsCMSEmailResult instanceof Error) {
                    logResolverError(
                        'sendQuestionsCMSEmail - CMS email failed',
                        sendQuestionsCMSEmailResult,
                        context
                    )
                    const errMessage = `Error sending a CMS email for
                questionID: ${questionResult.id} and contractID: ${contractResult.id}`
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                logResolverSuccess('createContractQuestion', context)

                return {
                    question: questionResult,
                }
            }
        )
    }
}
