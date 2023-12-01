import type { MutationResolvers } from '../../gen/gqlServer'
import { isCMSUser, contractSubmitters } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison } from '../../domain-models'
import type { Emailer } from '../../emailer'

export function createQuestionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['createQuestion'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context

        if (!isCMSUser(user)) {
            const msg = 'user not authorized to create a question'
            logError('createQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (
            !user.divisionAssignment ||
            (user.divisionAssignment &&
                !isValidCmsDivison(user.divisionAssignment))
        ) {
            const msg =
                'users without an assigned division are not authorized to create a question'
            logError('createQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new ForbiddenError(msg)
        }

        if (input.documents.length === 0) {
            const msg = 'question documents are required'
            logError('createQuestion', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new UserInputError(msg)
        }

        // Return error if package is not found or errors
        const contractResult = await store.findContractWithHistory(
            input.contractID
        )
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `Package with id ${input.contractID} does not exist`
                logError('createQuestion', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }

            const errMessage = `Issue finding a package. Message: ${contractResult.message}`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Return error if package status is DRAFT, contract will have no submitted revisions
        if (contractResult.revisions.length === 0) {
            const errMessage = `Issue creating question for health plan package. Message: Cannot create question for health plan package in DRAFT status`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        const statePrograms = store.findStatePrograms(contractResult.stateCode)
        const submitterEmails = contractSubmitters(contractResult)

        if (statePrograms instanceof Error) {
            logError('findStatePrograms', statePrograms.message)
            setErrorAttributesOnActiveSpan(statePrograms.message, span)
            throw new GraphQLError(statePrograms.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const questionResult = await store.insertQuestion(input, user)

        if (questionResult instanceof Error) {
            const errMessage = `Issue creating question for package. Message: ${questionResult.message}`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const dateAsked = new Date()
        const sendQuestionsStateEmailResult =
            await emailer.sendQuestionsStateEmail(
                contractResult.revisions[0],
                user,
                submitterEmails,
                statePrograms,
                dateAsked
            )

        if (sendQuestionsStateEmailResult instanceof Error) {
            logError(
                'sendQuestionsStateEmail - state email failed',
                sendQuestionsStateEmailResult
            )
            setErrorAttributesOnActiveSpan('state email failed', span)
            throw new GraphQLError('Email failed.', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('createQuestion')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: questionResult,
        }
    }
}
