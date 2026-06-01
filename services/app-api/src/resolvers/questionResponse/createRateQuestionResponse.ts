import { NotFoundError, type Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { GraphQLError } from 'graphql/index'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '@mc-review/submissions'
import { canWrite } from '../../authorization/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'

export function createRateQuestionResponseResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createRateQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'createRateQuestionResponse',
            { 'question.id': input.questionID },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'createRateQuestionResponse',
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

                if (!isStateUser(user)) {
                    const msg =
                        'user not authorized to create a question response'
                    logResolverError('createRateQuestionResponse', msg, context)
                    throw createForbiddenError(msg)
                }

                if (input.documents.length === 0) {
                    const msg = 'question response documents are required'
                    logResolverError('createRateQuestionResponse', msg, context)
                    throw createUserInputError(msg)
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

                const createResponseResult =
                    await store.insertRateQuestionResponse(inputFormatted, user)

                if (createResponseResult instanceof Error) {
                    if (createResponseResult instanceof NotFoundError) {
                        const errMessage = `Rate question with ID: ${input.questionID} not found to attach response to`
                        logResolverError(
                            'createRateQuestionResponse',
                            errMessage,
                            context
                        )
                        throw createUserInputError(errMessage)
                    }

                    const errMessage = `Issue creating question response for rate question ${input.questionID}. Message: ${createResponseResult.message}`
                    logResolverError(
                        'createRateQuestionResponse',
                        errMessage,
                        context
                    )
                    throw new Error(errMessage)
                }

                const rate = await store.findRateWithHistory(
                    createResponseResult.rateID
                )
                if (rate instanceof Error) {
                    if (rate instanceof NotFoundError) {
                        const errMessage = `Rate with id ${createResponseResult.rateID} does not exist`
                        logResolverError(
                            'createRateQuestionResponse',
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

                const questions = await store.findAllQuestionsByRate(
                    createResponseResult.rateID
                )

                if (questions instanceof Error) {
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

                const sendRateQuestionResponseCMSEmailResult =
                    await emailer.sendRateQuestionResponseCMSEmail(
                        rate,
                        stateAnalystsEmails,
                        questions,
                        createResponseResult
                    )

                if (sendRateQuestionResponseCMSEmailResult instanceof Error) {
                    logResolverError(
                        'sendRateQuestionsCMSEmail - CMS email failed',
                        sendRateQuestionResponseCMSEmailResult,
                        context
                    )
                    const errMessage = `Error sending a CMS email for
                responseID: ${createResponseResult.id} and rateID: ${rate.id}`
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
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

                const sendStateEmailResult =
                    await emailer.sendRateQuestionResponseStateEmail(
                        rate,
                        contractSubmissionType,
                        questions,
                        createResponseResult
                    )

                if (sendStateEmailResult instanceof Error) {
                    logResolverError(
                        'sendRateQuestionResponseStateEmail - Send State email',
                        sendStateEmailResult.message,
                        context
                    )
                    throw new GraphQLError('Email failed', {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                logResolverSuccess('createRateQuestionResponse', context)

                return {
                    question: createResponseResult,
                }
            }
        )
    }
}
