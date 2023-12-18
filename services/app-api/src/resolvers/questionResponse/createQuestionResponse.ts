import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser, contractSubmitters } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { EmailParameterStore } from '../../parameterStore'

export function createQuestionResponseResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore
): MutationResolvers['createQuestionResponse'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context

        if (!isStateUser(user)) {
            const msg = 'user not authorized to create a question response'
            logError('createQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question response documents are required'
            logError('createQuestionResponse', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg)
        }

        const createResponseResult = await store.insertQuestionResponse(
            input,
            user
        )

        if (createResponseResult instanceof Error) {
            if (createResponseResult instanceof NotFoundError) {
                const errMessage = `Question with ID: ${input.questionID} not found to attach response to`
                logError('createQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage)
            }

            const errMessage = `Issue creating question response for question ${input.questionID}. Message: ${createResponseResult.message}`
            logError('createQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const questions = await store.findAllQuestionsByContract(
            createResponseResult.contractID
        )
        if (questions instanceof Error) {
            const errMessage = `Issue finding all questions for contract with ID ${createResponseResult.contractID}. Message: ${questions.message}`
            logError('createQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const contract = await store.findContractWithHistory(
            createResponseResult.contractID
        )
        if (contract instanceof Error) {
            if (contract instanceof NotFoundError) {
                const errMessage = `Package with id ${createResponseResult.contractID} does not exist`
                logError('createQuestionResponse', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a package. Message: ${contract.message}`
            logError('createQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const statePrograms = store.findStatePrograms(contract.stateCode)
        if (statePrograms instanceof Error) {
            logError('createQuestionResponse', statePrograms.message)
            setErrorAttributesOnActiveSpan(statePrograms.message, span)
            throw new GraphQLError(statePrograms.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        const submitterEmails = contractSubmitters(contract)

        let stateAnalystsEmails =
            await emailParameterStore.getStateAnalystsEmails(contract.stateCode)
        //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
        if (stateAnalystsEmails instanceof Error) {
            logError('createQuestionResponse', stateAnalystsEmails.message)
            setErrorAttributesOnActiveSpan(stateAnalystsEmails.message, span)
            stateAnalystsEmails = []
        }

        const sendQuestionResponseCMSEmailResult =
            await emailer.sendQuestionResponseCMSEmail(
                contract.revisions[0],
                statePrograms,
                stateAnalystsEmails,
                createResponseResult,
                questions
            )

        if (sendQuestionResponseCMSEmailResult instanceof Error) {
            logError(
                'sendQuestionResponseCMSEmail - Send CMS email',
                sendQuestionResponseCMSEmailResult.message
            )
            setErrorAttributesOnActiveSpan(
                `Send CMS email failed: ${sendQuestionResponseCMSEmailResult.message}`,
                span
            )
            throw new GraphQLError('Email failed', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        const sendQuestionResponseStateEmailResult =
            await emailer.sendQuestionResponseStateEmail(
                contract.revisions[0],
                statePrograms,
                submitterEmails,
                createResponseResult,
                questions
            )

        if (sendQuestionResponseStateEmailResult instanceof Error) {
            logError(
                'sendQuestionResponseStateEmail - Send State email',
                sendQuestionResponseStateEmailResult.message
            )
            setErrorAttributesOnActiveSpan(
                `Send State email failed: ${sendQuestionResponseStateEmailResult.message}`,
                span
            )
            throw new GraphQLError('Email failed', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('createQuestionResponse')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: createResponseResult,
        }
    }
}
