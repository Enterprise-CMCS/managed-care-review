import type { MutationResolvers } from '../../gen/gqlServer'
import { isCMSUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isValidCmsDivison } from '../../domain-models'

export function createQuestionResolver(
    store: Store
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

        // Return error if package status is DRAFT
        // TODO we should have a helper for this
        if (
            contractResult.revisions.length === 1 &&
            contractResult.revisions[0].submitInfo === undefined
        ) {
            const errMessage = `Issue creating question for health plan package. Message: Cannot create question for health plan package in DRAFT status`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        const questionResult = await store.insertQuestion(input, user)

        if (isStoreError(questionResult)) {
            const errMessage = `Issue creating question for package of type ${questionResult.code}. Message: ${questionResult.message}`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('createQuestion')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: questionResult,
        }
    }
}
