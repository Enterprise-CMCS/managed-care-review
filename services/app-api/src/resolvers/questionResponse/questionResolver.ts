import type { Resolvers } from '../../gen/gqlServer'
import type {
    ContractQuestionType,
    RateQuestionType,
} from '../../domain-models'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import { logResolverError } from '../../logger'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'

export function questionResolver(store: Store): Resolvers['QuestionResolver'] {
    return {
        round: async (
            parent: ContractQuestionType | RateQuestionType,
            _args: Record<string, never>,
            context: Context
        ) => {
            return withResolverSpan(
                context,
                'QuestionResolver.round',
                { 'question.id': parent.id },
                async (span) => {
                    setResolverDetails(span, context.user)

                    const isContractQuestion = 'contractID' in parent
                    const type = isContractQuestion ? 'contract' : 'rate'
                    const id = isContractQuestion
                        ? parent.contractID
                        : parent.rateID
                    const storeMethod = isContractQuestion
                        ? store.findAllQuestionsByContract
                        : store.findAllQuestionsByRate

                    const questions:
                        | (ContractQuestionType | RateQuestionType)[]
                        | Error = await storeMethod(id)

                    if (!questions) {
                        const errMessage = `Questions not found for ${type}: ${id}`
                        logResolverError(
                            'questionResolver.round',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    if (questions instanceof Error) {
                        const errMessage = `Issue return questions for ${type} message: ${questions.message}`
                        logResolverError(
                            'questionResolver.round',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const divisionQuestions = questions
                        .filter((q) => q.division === parent.division)
                        .sort(
                            (a, b) =>
                                a.createdAt.getTime() - b.createdAt.getTime()
                        )

                    const matchingQuestion = divisionQuestions.find(
                        (question) => question.id == parent.id
                    )

                    if (!matchingQuestion) {
                        return 0
                    } else {
                        return divisionQuestions.indexOf(matchingQuestion) !==
                            undefined
                            ? divisionQuestions.indexOf(matchingQuestion) + 1
                            : 0
                    }
                }
            )
        },
    }
}
