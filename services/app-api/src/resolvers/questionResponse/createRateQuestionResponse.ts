import { NotFoundError, type Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { GraphQLError } from 'graphql/index'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { EmailParameterStore } from '../../parameterStore'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '../../common-code/healthPlanFormDataType'

export function createRateQuestionResponseResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['createRateQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createRateQuestionResponse', {}, ctx)
        const featureFlags = await launchDarkly.allFlags(context)
        const readStateAnalystsFromDBFlag =
            featureFlags?.['read-write-state-assignments']

        if (!isStateUser(user)) {
            const msg = 'user not authorized to create a question response'
            logError('createRateQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question response documents are required'
            logError('createRateQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg)
        }
        const docs = input.documents.map((doc) => {
            return {
                name: doc.name,
                s3URL: doc.s3URL,
                downloadURL: doc.downloadURL ?? undefined,
            }
        })
        const inputFormatted = {
            ...input,
            documents: docs,
        }

        const createResponseResult = await store.insertRateQuestionResponse(
            inputFormatted,
            user
        )

        if (createResponseResult instanceof Error) {
            if (createResponseResult instanceof NotFoundError) {
                const errMessage = `Rate question with ID: ${input.questionID} not found to attach response to`
                logError('createRateQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage)
            }

            const errMessage = `Issue creating question response for rate question ${input.questionID}. Message: ${createResponseResult.message}`
            logError('createRateQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const rate = await store.findRateWithHistory(
            createResponseResult.rateID
        )
        if (rate instanceof Error) {
            if (rate instanceof NotFoundError) {
                const errMessage = `Rate with id ${createResponseResult.rateID} does not exist`
                logError('createRateQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a contract. Message: ${rate.message}`
            logError('createRateQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const allQuestions = await store.findAllQuestionsByRate(rate.id)

        if (allQuestions instanceof Error) {
            const errMessage = `Issue finding all questions associated with the rate: ${rate.id}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        let stateAnalystsEmails: string[] = []
        if (readStateAnalystsFromDBFlag) {
            // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
            const stateAnalystsEmailsResult =
                await store.findStateAssignedUsers(
                    rate.stateCode as StateCodeType
                )

            if (stateAnalystsEmailsResult instanceof Error) {
                logError(
                    'getStateAnalystsEmails',
                    stateAnalystsEmailsResult.message
                )
                setErrorAttributesOnActiveSpan(
                    stateAnalystsEmailsResult.message,
                    span
                )
            } else {
                stateAnalystsEmails = stateAnalystsEmailsResult.map(
                    (u) => u.email
                )
            }
        } else {
            const stateAnalystsEmailsResult =
                await emailParameterStore.getStateAnalystsEmails(rate.stateCode)

            //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
            if (stateAnalystsEmailsResult instanceof Error) {
                logError(
                    'getStateAnalystsEmails',
                    stateAnalystsEmailsResult.message
                )
                setErrorAttributesOnActiveSpan(
                    stateAnalystsEmailsResult.message,
                    span
                )
            } else {
                stateAnalystsEmails = stateAnalystsEmailsResult
            }
        }

        const sendRateQuestionResponseCMSEmailResult =
            await emailer.sendRateQuestionResponseCMSEmail(
                rate,
                stateAnalystsEmails,
                allQuestions,
                createResponseResult
            )

        if (sendRateQuestionResponseCMSEmailResult instanceof Error) {
            logError(
                'sendRateQuestionsCMSEmail - CMS email failed',
                sendRateQuestionResponseCMSEmailResult
            )
            setErrorAttributesOnActiveSpan('CMS email failed', span)
            const errMessage = `Error sending a CMS email for 
                responseID: ${createResponseResult.id} and rateID: ${rate.id}`
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('createRateQuestionResponse')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: createResponseResult,
        }
    }
}
