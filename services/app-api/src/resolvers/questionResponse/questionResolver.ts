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
            if (questions instanceof Error) {
                const errMessage = `Issue finding contract message: ${questions.message}`

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            const divisionQuestions = questions
                ?.filter((q) => q.division === parent.division)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

            const matchingQuestion = divisionQuestions?.find(
                (question) => question.id == parent.id
            )

            if (!matchingQuestion) {
                return 0
            } else {
                return divisionQuestions?.indexOf(matchingQuestion) !==
                    undefined
                    ? divisionQuestions?.indexOf(matchingQuestion) + 1
                    : 0
            }
        },
        // responses: async (parent: any) => {
        //     const questions = await store.findAllQuestionsByContract(parent.contractID)
        //      if (questions instanceof Error) {
        //          const errMessage = `Issue finding contract message: ${questions.message}`

        //          throw new GraphQLError(errMessage, {
        //              extensions: {
        //                  code: 'INTERNAL_SERVER_ERROR',
        //                  cause: 'DB_ERROR',
        //              },
        //          })
        //     }

        //     let round = 0
        //     const divisionQuestions = questions?.
        //         filter((q) => q.division === parent.division).
        //         sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

        //     const matchingQuestion = divisionQuestions?.find(
        //         (question) => question.id == parent.id)

        //     if (!matchingQuestion) {
        //         round = 0
        //     } else {
        //         divisionQuestions?.indexOf(matchingQuestion) !== undefined
        //             ? round = divisionQuestions?.indexOf(matchingQuestion) + 1
        //             : round = 0
        //     }
        //     const responses = parent.responses.map((res: any) => {
        //         res.round = round
        //         return round
        //     })
        //     return responses
        // }
    }
}
