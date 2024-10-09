import { NotFoundError, type Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'

export function createRateQuestionResponseResolver(
    store: Store
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

        logSuccess('createRateQuestionResponse')
        setSuccessAttributesOnActiveSpan(span)

        return {
            question: createResponseResult,
        }
    }
}
