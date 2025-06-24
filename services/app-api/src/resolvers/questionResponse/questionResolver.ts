import type { Resolvers } from '../../gen/gqlServer'
import type {
    ContractQuestionType,
    RateQuestionType,
} from '../../domain-models'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'

export function questionResolver(store: Store): Resolvers['QuestionResolver'] {
    return {
        round: async (parent: ContractQuestionType | RateQuestionType) => {
            const isContractQuestion = 'contractID' in parent
            const type = isContractQuestion ? 'contract' : 'rate'
            const id = isContractQuestion ? parent.contractID : parent.rateID
            const storeMethod = isContractQuestion
                ? store.findAllQuestionsByContract
                : store.findAllQuestionsByRate

            const questions:
                | (ContractQuestionType | RateQuestionType)[]
                | Error = await storeMethod(id)

            if (!questions) {
                throw new Error(`Questions not found for ${type}: ${id}`)
            }

            if (questions instanceof Error) {
                const errMessage = `Issue return questions for ${type} message: ${questions.message}`

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            const divisionQuestions = questions
                .filter((q) => q.division === parent.division)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

            const matchingQuestion = divisionQuestions.find(
                (question) => question.id == parent.id
            )

            if (!matchingQuestion) {
                return 0
            } else {
                return divisionQuestions.indexOf(matchingQuestion) !== undefined
                    ? divisionQuestions.indexOf(matchingQuestion) + 1
                    : 0
            }
        },
    }
}
