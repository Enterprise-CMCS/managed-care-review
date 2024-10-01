import {
    CreateQuestionMutationFn,
    HealthPlanPackage,
    SubmitHealthPlanPackageMutationFn,
    UnlockHealthPlanPackageMutationFn,
    UnlockContractMutationFn,
    FetchHealthPlanPackageWithQuestionsQuery,
    FetchContractWithQuestionsQuery,
    FetchContractWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsDocument,
    IndexQuestionsPayload,
    CreateQuestionMutation,
    CreateQuestionResponseMutationFn,
    CreateQuestionResponseMutation,
    Question,
    Division,
    CreateQuestionInput,
    CreateQuestionResponseInput,
    SubmitContractMutationFn,
    Contract,
    UnlockedContract
} from '../gen/gqlClient'
import { ApolloError, GraphQLErrors } from '@apollo/client/errors'

import { recordJSException } from '../otelHelpers'
import { handleGQLErrors as handleGQLErrorLogging } from './apolloErrors'
import { ERROR_MESSAGES } from '../constants/errors'
/*
Adds user friendly/facing error messages to health plan package mutations.
- Reminder, we handle graphql requests via apollo client in our web app.
- Error messages returned here are displayed to user in UnlockSubmitModal > GenericApiBanner.
*/

type MutationType =
    | 'SUBMIT_HEALTH_PLAN_PACKAGE'
    | 'UNLOCK_HEALTH_PLAN_PACKAGE'
    | 'CREATE_QUESTION'
    | 'UNLOCK_RATE'

type IndexQuestionDivisions =
    | 'DMCOQuestions'
    | 'DMCPQuestions'
    | 'OACTQuestions'

const divisionToIndexQuestionDivision = (
    division: Division
): IndexQuestionDivisions =>
    `${division.toUpperCase()}Questions` as IndexQuestionDivisions


export const handleApolloErrorsAndAddUserFacingMessages = (
    apolloError: ApolloError,
    mutation: MutationType
) => {
    let message =
        mutation === 'SUBMIT_HEALTH_PLAN_PACKAGE'
            ? ERROR_MESSAGES.submit_error_generic
            : ERROR_MESSAGES.unlock_error_generic

    const options = {
        cause: {},
    }

    if (apolloError.graphQLErrors) {
        handleGQLErrorLogging(apolloError.graphQLErrors)

        apolloError.graphQLErrors.forEach(({ extensions }) => {
            // handle most common error cases with more specific messaging
            if (
                extensions.code === 'INTERNAL_SERVER_ERROR' &&
                extensions.cause === 'EMAIL_ERROR'
            ) {
                message = ERROR_MESSAGES.email_error_generic
                options.cause = extensions.cause
            }
            if (
                extensions.code === 'BAD_USER_INPUT' &&
                mutation === 'SUBMIT_HEALTH_PLAN_PACKAGE'
            ) {
                message = ERROR_MESSAGES.submit_missing_field
                options.cause = extensions.code
            }
            if (
                extensions.cause === 'INVALID_PACKAGE_STATUS' &&
                mutation === 'UNLOCK_HEALTH_PLAN_PACKAGE'
            ) {
                message = ERROR_MESSAGES.unlock_invalid_package_status // / TODO: This is should be a custom ApolloError such as INVALID_PACKAGE_STATUS or ACTION_UNAVAILABLE, not user input error since doesn't involve form fields the user controls
                options.cause = extensions.cause
            }
        })
    }

    return new Error(message, options)
}

export const unlockMutationWrapper = async (
    unlockHealthPlanPackage: UnlockHealthPlanPackageMutationFn,
    id: string,
    unlockedReason: string
): Promise<HealthPlanPackage | GraphQLErrors | Error> => {
    try {
        const { data } = await unlockHealthPlanPackage({
            variables: {
                input: {
                    pkgID: id,
                    unlockedReason,
                },
            },
        })

        if (data?.unlockHealthPlanPackage.pkg) {
            return data?.unlockHealthPlanPackage.pkg
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to unlock, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.unlock_error_generic)
        }
    } catch (error) {
        return handleApolloErrorsAndAddUserFacingMessages(
            error,
            'UNLOCK_HEALTH_PLAN_PACKAGE'
        )
    }
}

export const unlockMutationWrapperV2 = async (
    unlockContract: UnlockContractMutationFn,
    id: string,
    unlockedReason: string
): Promise<UnlockedContract | GraphQLErrors | Error> => {
    try {
        const { data } = await unlockContract({
            variables: {
                input: {
                    contractID: id,
                    unlockedReason,
                },
            },
        })

        if (data?.unlockContract.contract) {
            return data?.unlockContract.contract
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to unlock, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.unlock_error_generic)
        }
    } catch (error) {
        return handleApolloErrorsAndAddUserFacingMessages(
            error,
            'UNLOCK_HEALTH_PLAN_PACKAGE'
        )
    }
}

export const submitMutationWrapper = async (
    submitDraftSubmission: SubmitHealthPlanPackageMutationFn,
    id: string,
    submittedReason?: string
): Promise<Partial<HealthPlanPackage> | GraphQLErrors | Error> => {
    const input = { pkgID: id }

    if (submittedReason) {
        Object.assign(input, {
            submittedReason,
        })
    }

    try {
        const { data } = await submitDraftSubmission({
            variables: {
                input,
            },
        })

        if (data?.submitHealthPlanPackage.pkg) {
            return data.submitHealthPlanPackage.pkg
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to submit, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.submit_error_generic)
        }
    } catch (error) {
        return handleApolloErrorsAndAddUserFacingMessages(
            error,
            'SUBMIT_HEALTH_PLAN_PACKAGE'
        )
    }
}

export const submitMutationWrapperV2 = async (
    submitContract: SubmitContractMutationFn,
    id: string,
    submittedReason?: string
): Promise<Partial<Contract> | GraphQLErrors | Error> => {
    const input = { contractID: id }

    if (submittedReason) {
        Object.assign(input, {
            submittedReason,
        })
    }

    try {
        const { data } = await submitContract({
            variables: {
                input,
            },
        })

        if (data?.submitContract.contract) {
            return data.submitContract.contract
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to submit, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.submit_error_generic)
        }
    } catch (error) {
        return handleApolloErrorsAndAddUserFacingMessages(
            error,
            'SUBMIT_HEALTH_PLAN_PACKAGE'
        )
    }
}

/**
 * Manually updating the cache for Q&A mutations because the Q&A page is in a layout route that is not unmounted during the Q&A
 * workflow. So, when calling Q&A mutations the Q&A page will not refetch the data. The alternative would be to use
 * cache.evict() to force a refetch, but would then cause the loading UI to show.
 **/
export const createQuestionWrapper = async (
    createQuestion: CreateQuestionMutationFn,
    input: CreateQuestionInput
): Promise<CreateQuestionMutation | GraphQLErrors | Error> => {
    try {
        const result = await createQuestion({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newQuestion = data.createQuestion.question as Question
                    const result =
                        cache.readQuery<FetchContractWithQuestionsQuery>(
                            {
                                query: FetchContractWithQuestionsDocument,
                                variables: {
                                    input: {
                                        contractID: newQuestion.contractID,
                                    },
                                },
                            }
                        )

                    const contract = result?.fetchContract.contract

                    if (contract) {
                        const indexQuestionDivision =
                            divisionToIndexQuestionDivision(
                                newQuestion.division
                            )
                        const questions = contract.questions as IndexQuestionsPayload
                        const divisionQuestions =
                            questions[indexQuestionDivision]

                        cache.writeQuery({
                            query: FetchContractWithQuestionsDocument,
                            data: {
                                fetchContract: {
                                    contract: {
                                        ...contract,
                                        questions: {
                                            ...contract.questions,
                                            [indexQuestionDivision]: {
                                                totalCount:
                                                    divisionQuestions.totalCount
                                                        ? divisionQuestions.totalCount +
                                                          1
                                                        : 1,
                                                edges: [
                                                    {
                                                        __typename:
                                                            'QuestionEdge',
                                                        node: {
                                                            ...newQuestion,
                                                            responses: [],
                                                        },
                                                    },
                                                    ...divisionQuestions.edges,
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        })
                    }
                }
            },
            onQueryUpdated: () => true,
        })

        if (result.data?.createQuestion) {
            return result.data
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to add question, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.question_error_generic)
        }
    } catch (error) {
        return error
    }
}

export const createResponseWrapper = async (
    createResponse: CreateQuestionResponseMutationFn,
    contractID: string,
    input: CreateQuestionResponseInput,
    division: Division
): Promise<CreateQuestionResponseMutation | GraphQLErrors | Error> => {
    try {
        const result = await createResponse({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newResponse =
                        data.createQuestionResponse.question.responses[0]
                    const result =
                        cache.readQuery<FetchContractWithQuestionsQuery>(
                            {
                                query: FetchContractWithQuestionsDocument,
                                variables: {
                                    input: {
                                        contractID: contractID,
                                    },
                                },
                            }
                        )
                    const contract = result?.fetchContract.contract

                    if (contract) {
                        const questions = contract.questions as IndexQuestionsPayload
                        const indexQuestionDivision =
                            divisionToIndexQuestionDivision(division)
                        const divisionQuestions =
                            questions[indexQuestionDivision]

                        const updatedContract = {
                            ...contract,
                            questions: {
                                ...contract.questions,
                                [indexQuestionDivision]: {
                                    ...divisionQuestions,
                                    edges: divisionQuestions.edges.map(
                                        (edge) => {
                                            if (
                                                edge.node.id ===
                                                newResponse.questionID
                                            ) {
                                                return {
                                                    __typename: 'QuestionEdge',
                                                    node: {
                                                        ...edge.node,
                                                        responses: [
                                                            newResponse,
                                                            ...edge.node
                                                                .responses,
                                                        ],
                                                    },
                                                }
                                            }
                                            return edge
                                        }
                                    ),
                                },
                            },
                        }

                        cache.writeQuery({
                            query: FetchContractWithQuestionsDocument,
                            data: {
                                fetchContract: {
                                    contract: updatedContract,
                                },
                            },
                        })
                    }
                }
            },
            onQueryUpdated: () => true,
        })

        if (result.data?.createQuestionResponse) {
            return result.data
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to add response, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.response_error_generic)
        }
    } catch (error) {
        return error
    }
}
