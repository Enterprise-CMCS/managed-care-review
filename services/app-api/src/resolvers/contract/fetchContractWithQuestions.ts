import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import type { QuestionIndexType } from '../../domain-models/contractAndRates/baseContractRateTypes'
export function fetchContractWithQuestionsResolver(
    store: Store
): QueryResolvers['fetchContractWithQuestions'] {
    return async (_parent, { input }, context) => {
        console.error(
            '=================================== HI ======================'
        )
        const { user, ctx, tracer } = context
        // add a span to OTEL
        const span = tracer?.startSpan(
            'fetchContractWithQuestionsResolver',
            {},
            ctx
        )
        setResolverDetailsOnActiveSpan('fetchContractWithQuestions', user, span)

        const contractWithHistory = await store.findContractWithHistory(
            input.contractID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (contractWithHistory instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const questionsForContract = await store.findAllQuestionsByContract(
            input.contractID
        )
        if (questionsForContract instanceof Error) {
            const errMessage = `Issue finding contract message: ${questionsForContract.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (questionsForContract instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        console.info(
            '============== QUESTIONS FOR CONTRACT ===========',
            questionsForContract
        )
        const dmcoQuestions = questionsForContract
            .filter((question) => question.division === 'DMCO')
            .map((question) => {
                return {
                    node: {
                        ...question,
                    },
                }
            })
        const dmcpQuestions = questionsForContract
            .filter((question) => question.division === 'DMCP')
            .map((question) => {
                return {
                    node: {
                        ...question,
                    },
                }
            })
        const oactQuestions = questionsForContract
            .filter((question) => question.division === 'OACT')
            .map((question) => {
                return {
                    node: {
                        ...question,
                    },
                }
            })

        const questionPayload: QuestionIndexType = {
            DMCOQuestions: {
                totalCount: dmcoQuestions.length,
                edges: dmcoQuestions,
            },
            DMCPQuestions: {
                totalCount: dmcpQuestions.length,
                edges: dmcpQuestions,
            },
            OACTQuestions: {
                totalCount: oactQuestions.length,
                edges: oactQuestions,
            },
        }
        // A state user cannot access contracts that don't belong to their state
        if (isStateUser(user)) {
            if (contractWithHistory.stateCode !== user.stateCode) {
                const errMessage = `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                setErrorAttributesOnActiveSpan(errMessage, span)

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'FORBIDDEN',
                        cause: 'INVALID_STATE_REQUESTER',
                    },
                })
            }
        }

        setSuccessAttributesOnActiveSpan(span)
        return {
            contract: {
                ...contractWithHistory,
                questions: questionPayload,
            },
        }
    }
}
