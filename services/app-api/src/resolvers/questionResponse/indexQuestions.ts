import { isStateUser } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { logError } from '../../logger'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import { convertToIndexQuestionsPayload } from '../../postgres/questionResponse'

export function indexQuestionsResolver(
    store: Store
): QueryResolvers['indexQuestions'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexQuestions', {}, ctx)

        const contractResult = await store.findContractWithHistory(
            input.contractID
        )
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `Issue finding a contract with id ${input.contractID}. Message: Contract with id ${input.contractID} does not exist`
                logError('indexQuestion', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: { code: 'NOT_FOUND' },
                })
            }
            const errMessage = `Issue finding a package. Message: ${contractResult.message}`
            logError('indexQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        const contract = contractResult
        // State users can only view if the state matches
        if (isStateUser(user) && contract.stateCode !== user.stateCode) {
            const errMessage =
                'User not authorized to fetch data from a different state'
            logError('indexQuestions', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        const questionResult = await store.findAllQuestionsByContract(
            input.contractID
        )

        if (questionResult instanceof Error) {
            const errMessage = `Issue finding questions. Message: ${questionResult.message}`
            logError('indexQuestions', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const indexQuestionPayload =
            convertToIndexQuestionsPayload(questionResult)

        return indexQuestionPayload
    }
}
