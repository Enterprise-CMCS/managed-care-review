import type { MutationResolvers } from '../../gen/gqlServer'
import { hasCMSPermissions, isValidCmsDivison } from '../../domain-models'
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
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '@mc-review/submissions'
import { canWrite } from '../../authorization/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'

export function createRateQuestionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createRateQuestion'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'createRateQuestion',
            { 'rate.id': input.rateID },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!hasCMSPermissions(user)) {
                    const msg = 'user not authorized to create a question'
                    logResolverError('createRateQuestion', msg, context)
                    throw createForbiddenError(msg)
                }

                if (
                    !user.divisionAssignment ||
                    (user.divisionAssignment &&
                        !isValidCmsDivison(user.divisionAssignment))
                ) {
                    const msg =
                        'users without an assigned division are not authorized to create a question'
                    logResolverError('createRateQuestion', msg, context)
                    throw createForbiddenError(msg)
                }

                if (input.documents.length === 0) {
                    const msg = 'question documents are required'
                    logResolverError('createRateQuestion', msg, context)
                    throw createUserInputError(msg)
                }

                const rate = await store.findRateWithHistory(input.rateID)

                if (rate instanceof Error) {
                    if (rate instanceof NotFoundError) {
                        const errMessage = `Rate with id ${input.rateID} does not exist`
                        logResolverError(
                            'createRateQuestion',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: { code: 'NOT_FOUND' },
                        })
                    }

                    const errMessage = `Issue finding a rate. Message: ${rate.message}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (['DRAFT', 'WITHDRAWN'].includes(rate.consolidatedStatus)) {
                    const errMessage = `Issue creating question for rate. Message: Rate is in an invalid status: ${rate.consolidatedStatus}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw createUserInputError(errMessage)
                }

                // Do not allow a new question to be created while a previous
                // question round is still open. A round is open when any
                // existing question has not yet received a response. Mirrors
                // the allQuestionsAnswered logic in app-web's
                // questionResponseHelpers.ts.
                const existingQuestions = await store.findAllQuestionsByRate(
                    rate.id
                )
                if (existingQuestions instanceof Error) {
                    const errMessage = `Issue finding all questions associated with the rate: ${rate.id}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw new Error(errMessage)
                }

                const hasOpenQuestionRound = existingQuestions.some(
                    (question) => question.responses.length === 0
                )
                if (hasOpenQuestionRound) {
                    logResolverError(
                        'createRateQuestion',
                        OPEN_QUESTION_ROUND_ERROR_MESSAGE,
                        context
                    )
                    throw createUserInputError(
                        OPEN_QUESTION_ROUND_ERROR_MESSAGE
                    )
                }

                // Parse and validate document s3URLs
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

                const questionResult = await store.insertRateQuestion(
                    inputFormatted,
                    user
                )

                if (questionResult instanceof Error) {
                    // The store re-checks for an open question round inside a
                    // row-locked transaction; a request that loses a concurrent
                    // race is rejected here with a BAD_USER_INPUT error.
                    if (questionResult instanceof UserInputPostgresError) {
                        logResolverError(
                            'createRateQuestion',
                            questionResult.message,
                            context
                        )
                        throw handleUserInputPostgresError(questionResult)
                    }

                    const errMessage = `Issue creating question for rate. Message: ${questionResult.message}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw new Error(errMessage)
                }

                const allQuestions = await store.findAllQuestionsByRate(rate.id)

                if (allQuestions instanceof Error) {
                    const errMessage = `Issue finding all questions associated with the rate: ${rate.id}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw new Error(errMessage)
                }

                let stateAnalystsEmails: string[] = []

                // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
                const stateAnalystsEmailsResult =
                    await store.findStateAssignedUsers(
                        rate.stateCode as StateCodeType
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

                const contractSubmissionType = rate.packageSubmissions
                    .flatMap((pkg) => pkg.contractRevisions)
                    .find((cr) => cr.contract.id === rate.parentContractID)
                    ?.contract.contractSubmissionType

                if (!contractSubmissionType) {
                    const errMessage = `Issue creating question for rate. Message: Parent contract missing contract type. Parent contract ID: ${rate.parentContractID}`
                    logResolverError('createRateQuestion', errMessage, context)
                    throw createUserInputError(errMessage)
                }

                const sendRateQuestionStateEmailResult =
                    await emailer.sendRateQuestionStateEmail(
                        rate,
                        contractSubmissionType,
                        questionResult
                    )

                if (sendRateQuestionStateEmailResult instanceof Error) {
                    logResolverError(
                        'sendRateQuestionsStateEmail - state email failed',
                        sendRateQuestionStateEmailResult,
                        context
                    )
                    const errMessage = `Error sending a state email for
                questionID: ${questionResult.id} and rate: ${rate.id}`
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                const sendRateQuestionCMSEmailResult =
                    await emailer.sendRateQuestionCMSEmail(
                        rate,
                        stateAnalystsEmails,
                        allQuestions,
                        questionResult
                    )

                if (sendRateQuestionCMSEmailResult instanceof Error) {
                    logResolverError(
                        'sendRateQuestionsCMSEmail - CMS email failed',
                        sendRateQuestionCMSEmailResult,
                        context
                    )
                    const errMessage = `Error sending a CMS email for
                questionID: ${questionResult.id} and contractID: ${rate.id}`
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                logResolverSuccess('createRateQuestion', context)

                return {
                    question: questionResult,
                }
            }
        )
    }
}
