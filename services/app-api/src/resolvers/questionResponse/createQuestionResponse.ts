import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'

export function createQuestionResponseResolver(
    store: Store
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

        const responseResult = await store.insertQuestionResponse(input, user)

        if (isStoreError(responseResult)) {
            const errMessage = `Issue creating question response for question ${input.questionID} of type ${responseResult.code}. Message: ${responseResult.message}`
            logError('createQuestionResponse', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        logSuccess('createQuestionResponse')
        setSuccessAttributesOnActiveSpan(span)

        return {
            response: responseResult,
        }
    }
}
