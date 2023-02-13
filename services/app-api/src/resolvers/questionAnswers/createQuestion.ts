import { MutationResolvers } from '../../gen/gqlServer'
import { isCMSUser, packageStatus } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStoreError, Store } from '../../postgres'
import { GraphQLError } from 'graphql'

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

        // Return error if package is not found or errors
        const result = await store.findHealthPlanPackage(input.pkgID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Result was undefined`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: { code: 'NOT_FOUND' },
            })
        }

        // Return error if package status is DRAFT
        const packageStats = packageStatus(result)

        if (packageStats === 'DRAFT') {
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
