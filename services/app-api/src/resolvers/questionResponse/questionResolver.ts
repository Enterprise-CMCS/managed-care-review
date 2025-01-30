import type { Resolvers } from '../../gen/gqlServer'

import type { ContractQuestionType } from '../../domain-models'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'

export function questionResolver(store: Store): Resolvers['QuestionResolver'] {
    return {
        round: async (parent: ContractQuestionType) => {
            const questions = await store.findAllQuestionsByContract(
                parent.contractID
            )
            if (!questions) {
                throw new Error(
                    `Questions not found for contract: ${parent.contractID}`
                )
            }
            if (questions instanceof Error) {
                const errMessage = `Issue return questions for contract message: ${questions.message}`

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
