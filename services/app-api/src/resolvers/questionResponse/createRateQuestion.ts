import type { MutationResolvers } from '../../gen/gqlServer'
import { hasCMSPermissions, isValidCmsDivison } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError, type Store } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '../../testHelpers'
import { canWrite } from '../../authorization/oauthAuthorization'

export function createRateQuestionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createRateQuestion'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createRateQuestion', {}, ctx)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!hasCMSPermissions(user)) {
            const msg = 'user not authorized to create a question'
            logError('createRateQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        if (
            !user.divisionAssignment ||
            (user.divisionAssignment &&
                !isValidCmsDivison(user.divisionAssignment))
        ) {
            const msg =
                'users without an assigned division are not authorized to create a question'
            logError('createRateQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question documents are required'
            logError('createRateQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg)
        }

        const rate = await store.findRateWithHistory(input.rateID)

        if (rate instanceof Error) {
            if (rate instanceof NotFoundError) {
                const errMessage = `Rate with id ${input.rateID} does not exist`
                logError('createRateQuestion', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a rate. Message: ${rate.message}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (['DRAFT', 'WITHDRAWN'].includes(rate.consolidatedStatus)) {
            const errMessage = `Issue creating question for rate. Message: Rate is in a invalid statius: ${rate.consolidatedStatus}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        const inputFormatted = {
            ...input,
            documents: input.documents.map((doc) => {
                return {
                    name: doc.name,
                    s3URL: doc.s3URL,
                }
            }),
        }

        const questionResult = await store.insertRateQuestion(
            inputFormatted,
            user
        )

        if (questionResult instanceof Error) {
            const errMessage = `Issue creating question for rate. Message: ${questionResult.message}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const allQuestions = await store.findAllQuestionsByRate(rate.id)

        if (allQuestions instanceof Error) {
            const errMessage = `Issue finding all questions associated with the rate: ${rate.id}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        let stateAnalystsEmails: string[] = []

        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
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
            stateAnalystsEmails = stateAnalystsEmailsResult.map((u) => u.email)
        }

        const sendRateQuestionStateEmailResult =
            await emailer.sendRateQuestionStateEmail(rate, questionResult)

        if (sendRateQuestionStateEmailResult instanceof Error) {
            logError(
                'sendRateQuestionsStateEmail - state email failed',
                sendRateQuestionStateEmailResult
            )
            setErrorAttributesOnActiveSpan('state email failed', span)
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
            logError(
                'sendRateQuestionsCMSEmail - CMS email failed',
                sendRateQuestionCMSEmailResult
            )
            setErrorAttributesOnActiveSpan('CMS email failed', span)
            const errMessage = `Error sending a CMS email for 
                questionID: ${questionResult.id} and contractID: ${rate.id}`
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('createRateQuestion')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: questionResult,
        }
    }
}
