import { isStateUser } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import { logError } from '../../logger'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import { convertToIndexQuestionsPayload } from '../../postgres/questionResponse'

export function indexQuestionsResolver(
    store: Store
): QueryResolvers['indexQuestions'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const pkgResult = await store.findHealthPlanPackage(input.pkgID)

        if (isStoreError(pkgResult)) {
            const errMessage = `Issue finding a package of type ${pkgResult.code}. Message: ${pkgResult.message}`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        if (pkgResult === undefined) {
            const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Package with id ${input.pkgID} does not exist`
            logError('createQuestion', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: { code: 'NOT_FOUND' },
            })
        }

        // State users can only view if the state matches
        if (isStateUser(user) && pkgResult.stateCode !== user.stateCode) {
            const errMessage =
                'User not authorized to fetch data from a different state'
            logError('indexQuestions', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        const questionResult = await store.findAllQuestionsByHealthPlanPackage(
            input.pkgID
        )

        if (isStoreError(questionResult)) {
            const errMessage = `Issue finding questions of type ${questionResult.code}. Message: ${questionResult.message}`
            logError('indexQuestions', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const indexQuestionPayload =
            convertToIndexQuestionsPayload(questionResult)

        return indexQuestionPayload
    }
}
