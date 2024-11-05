import { NotFoundError, type Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'

export function createRateQuestionResponseResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createRateQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createRateQuestionResponse', {}, ctx)

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

        const questions = await store.findAllQuestionsByRate(
            createResponseResult.rateID
        )

        if (questions instanceof Error) {
            const errMessage = `Issue finding all questions associated with the rate: ${rate.id}`
            logError('createRateQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const sendStateEmailResult =
            await emailer.sendRateQuestionResponseStateEmail(
                rate,
                questions,
                createResponseResult
            )

        if (sendStateEmailResult instanceof Error) {
            logError(
                'sendRateQuestionResponseStateEmail - Send State email',
                sendStateEmailResult.message
            )
            setErrorAttributesOnActiveSpan(
                `Send State email failed: ${sendStateEmailResult.message}`,
                span
            )
            throw new GraphQLError('Email failed', {
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
