import {
    CreateContractQuestionMutationFn,
    UnlockContractMutationFn,
    FetchContractWithQuestionsQuery,
    FetchContractWithQuestionsDocument,
    IndexContractQuestionsPayload,
    CreateContractQuestionMutation,
    CreateContractQuestionResponseMutationFn,
    CreateContractQuestionResponseMutation,
    ContractQuestion,
    Division,
    CreateContractQuestionInput,
    CreateQuestionResponseInput,
    SubmitContractMutationFn,
    Contract,
    UnlockedContract,
    UpdateStateAssignmentsByStateMutationFn,
    FetchMcReviewSettingsDocument,
    FetchMcReviewSettingsQuery,
    CreateRateQuestionMutation,
    CreateRateQuestionInput,
    CreateRateQuestionMutationFn,
    RateQuestion,
    FetchRateWithQuestionsDocument,
    IndexRateQuestionsPayload,
    FetchRateWithQuestionsQuery,
    CreateRateQuestionResponseMutationFn,
    CreateRateQuestionResponseMutation,
    ApproveContractMutationFn,
} from '../gen/gqlClient'
import { GraphQLErrors } from '@apollo/client/errors'

import { recordJSException } from '@mc-review/otel'
import { handleGQLErrors as handleGQLErrorLogging } from './apolloErrors'
import { ApolloError } from '@apollo/client/errors'
import { ERROR_MESSAGES } from '@mc-review/constants'

/*
Adds user friendly/facing error messages to GraphQL mutations.
- Reminder, we handle GraphQL requests via Apollo Client in our web app.
- Now uses standard GraphQLError from graphql package instead of Apollo-specific types

TODO: move out domain specific code to files named after that domain
e.g. handleGraphQLErrorAndAddUserFacingMessages can stay, anything specific to one API should be in a more narrowly scoped file
*/

type MutationType =
    | 'SUBMIT_HEALTH_PLAN_PACKAGE'
    | 'UNLOCK_HEALTH_PLAN_PACKAGE'
    | 'APPROVE_SUBMISSION'
    | 'CREATE_QUESTION'
    | 'UNLOCK_RATE'
    | 'UPDATE_STATE_ASSIGNMENTS_BY_STATE'

type IndexQuestionDivisions =
    | 'DMCOQuestions'
    | 'DMCPQuestions'
    | 'OACTQuestions'

const divisionToIndexQuestionDivision = (
    division: Division
): IndexQuestionDivisions =>
    `${division.toUpperCase()}Questions` as IndexQuestionDivisions

export const handleGraphQLErrorsAndAddUserFacingMessages = (
    error: ApolloError | Error,
    mutation: MutationType
) => {
    let message
    switch (mutation) {
        case 'SUBMIT_HEALTH_PLAN_PACKAGE':
            message = ERROR_MESSAGES.submit_error_generic
            break
        case 'UNLOCK_HEALTH_PLAN_PACKAGE':
            message = ERROR_MESSAGES.unlock_error_generic
            break
        case 'APPROVE_SUBMISSION':
            message = ERROR_MESSAGES.approve_error_generic
            break
    }

    const options = {
        cause: {},
    }

    // Extract GraphQL errors from ApolloError
    let graphQLErrors: GraphQLErrors = []

    if (error instanceof ApolloError && error.graphQLErrors) {
        graphQLErrors = error.graphQLErrors
    }

    if (graphQLErrors.length > 0) {
        handleGQLErrorLogging(graphQLErrors)

        graphQLErrors.forEach(({ extensions }) => {
            // handle most common error cases with more specific messaging
            if (
                extensions?.code === 'INTERNAL_SERVER_ERROR' &&
                extensions.cause === 'EMAIL_ERROR'
            ) {
                message = ERROR_MESSAGES.email_error_generic
                options.cause = extensions.cause
            }
            if (
                extensions?.code === 'BAD_USER_INPUT' &&
                mutation === 'SUBMIT_HEALTH_PLAN_PACKAGE'
            ) {
                message = ERROR_MESSAGES.submit_missing_field
                options.cause = extensions.code
            }
            if (
                extensions?.cause === 'INVALID_PACKAGE_STATUS' &&
                mutation === 'UNLOCK_HEALTH_PLAN_PACKAGE'
            ) {
                message = ERROR_MESSAGES.unlock_invalid_package_status // / TODO: This should be a custom GraphQLError such as INVALID_PACKAGE_STATUS or ACTION_UNAVAILABLE, not user input error since doesn't involve form fields the user controls
                options.cause = extensions.cause
            }
        })
    }

    return new Error(message, options)
}

export const unlockMutationWrapper = async (
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
        return handleGraphQLErrorsAndAddUserFacingMessages(
            error,
            'UNLOCK_HEALTH_PLAN_PACKAGE'
        )
    }
}

export const submitMutationWrapper = async (
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
        return handleGraphQLErrorsAndAddUserFacingMessages(
            error,
            'SUBMIT_HEALTH_PLAN_PACKAGE'
        )
    }
}

export const approveMutationWrapper = async (
    approveContract: ApproveContractMutationFn,
    id: string,
    dateApprovalReleasedToState: string
): Promise<Partial<Contract> | GraphQLErrors | Error> => {
    const input = {
        contractID: id,
        dateApprovalReleasedToState,
    }

    try {
        const { data } = await approveContract({
            variables: {
                input,
            },
        })

        if (data?.approveContract?.contract) {
            return data.approveContract.contract
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to approve contract, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.approve_error_generic)
        }
    } catch (error) {
        return handleGraphQLErrorsAndAddUserFacingMessages(
            error,
            'APPROVE_SUBMISSION'
        )
    }
}

export async function updateStateAssignmentsWrapper(
    updateStateAssignments: UpdateStateAssignmentsByStateMutationFn,
    stateCode: string,
    assignedUserIDs: string[]
): Promise<undefined | GraphQLErrors | Error> {
    const input = {
        stateCode,
        assignedUsers: assignedUserIDs,
    }

    try {
        const { data } = await updateStateAssignments({
            variables: {
                input,
            },
            update(cache, { data }) {
                if (data) {
                    const stateCode =
                        data.updateStateAssignmentsByState.stateCode
                    const updatedUsers =
                        data.updateStateAssignmentsByState.assignedUsers
                    const previousSettings =
                        cache.readQuery<FetchMcReviewSettingsQuery>({
                            query: FetchMcReviewSettingsDocument,
                        })

                    if (previousSettings) {
                        const cachedAssignments = [
                            ...previousSettings.fetchMcReviewSettings
                                .stateAssignments,
                        ]
                        const stateIndex = cachedAssignments.findIndex(
                            (state) => state.stateCode === stateCode
                        )
                        if (stateIndex === -1) {
                            recordJSException(
                                `[UNEXPECTED]: Error attempting to update state assignments cache, state not found in cache.`
                            )
                            return new Error(
                                ERROR_MESSAGES.update_state_assignments_generic
                            )
                        }

                        cachedAssignments[stateIndex] = {
                            ...cachedAssignments[stateIndex],
                            assignedCMSUsers: updatedUsers,
                        }

                        cache.writeQuery({
                            query: FetchMcReviewSettingsDocument,
                            data: {
                                fetchMcReviewSettings: {
                                    ...previousSettings.fetchMcReviewSettings,
                                    stateAssignments: cachedAssignments,
                                },
                            },
                        })
                    }
                }
            },
        })

        if (data?.updateStateAssignmentsByState.assignedUsers) {
            return undefined
        } else {
            recordJSException(
                `[UNEXPECTED]: Error attempting to update state assignments, no data present but returning 200.`
            )
            return new Error(ERROR_MESSAGES.update_state_assignments_generic)
        }
    } catch (error) {
        return handleGraphQLErrorsAndAddUserFacingMessages(
            error,
            'UPDATE_STATE_ASSIGNMENTS_BY_STATE'
        )
    }
}

/**
 * Manually updating the cache for Q&A mutations because the Q&A page is in a layout route that is not unmounted during the Q&A
 * workflow. So, when calling Q&A mutations the Q&A page will not refetch the data. The alternative would be to use
 * cache.evict() to force a refetch, but would then cause the loading UI to show.
 **/
export const createContractQuestionWrapper = async (
    createQuestion: CreateContractQuestionMutationFn,
    input: CreateContractQuestionInput
): Promise<CreateContractQuestionMutation | GraphQLErrors | Error> => {
    try {
        const result = await createQuestion({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newQuestion = data.createContractQuestion
                        .question as ContractQuestion
                    const result =
                        cache.readQuery<FetchContractWithQuestionsQuery>({
                            query: FetchContractWithQuestionsDocument,
                            variables: {
                                input: {
                                    contractID: newQuestion.contractID,
                                },
                            },
                        })

                    const contract = result?.fetchContract.contract

                    if (contract) {
                        const indexQuestionDivision =
                            divisionToIndexQuestionDivision(
                                newQuestion.division
                            )
                        const questions =
                            contract.questions as IndexContractQuestionsPayload
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
                                                            'ContractQuestionEdge',
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

        if (result.data?.createContractQuestion) {
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

export const createRateQuestionWrapper = async (
    createQuestion: CreateRateQuestionMutationFn,
    input: CreateRateQuestionInput
): Promise<CreateRateQuestionMutation | GraphQLErrors | Error> => {
    try {
        const result = await createQuestion({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newQuestion = data.createRateQuestion
                        .question as RateQuestion
                    const result = cache.readQuery<FetchRateWithQuestionsQuery>(
                        {
                            query: FetchRateWithQuestionsDocument,
                            variables: {
                                input: {
                                    rateID: newQuestion.rateID,
                                },
                            },
                        }
                    )

                    const rate = result?.fetchRate.rate

                    if (rate) {
                        const indexQuestionDivision =
                            divisionToIndexQuestionDivision(
                                newQuestion.division
                            )
                        const questions =
                            rate.questions as IndexRateQuestionsPayload
                        const divisionQuestions =
                            questions[indexQuestionDivision]

                        cache.writeQuery({
                            query: FetchRateWithQuestionsDocument,
                            data: {
                                fetchRate: {
                                    rate: {
                                        ...rate,
                                        questions: {
                                            ...rate.questions,
                                            [indexQuestionDivision]: {
                                                totalCount:
                                                    divisionQuestions.totalCount
                                                        ? divisionQuestions.totalCount +
                                                          1
                                                        : 1,
                                                edges: [
                                                    {
                                                        __typename:
                                                            'RateQuestionEdge',
                                                        node: {
                                                            ...newQuestion,
                                                            createdAt:
                                                                new Date(),
                                                            documents:
                                                                newQuestion.documents.map(
                                                                    (doc) => ({
                                                                        ...doc,
                                                                        downloadURL:
                                                                            null,
                                                                    })
                                                                ),
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

        if (result.data?.createRateQuestion) {
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

export const createContractResponseWrapper = async (
    createResponse: CreateContractQuestionResponseMutationFn,
    contractID: string,
    input: CreateQuestionResponseInput,
    division: Division
): Promise<CreateContractQuestionResponseMutation | GraphQLErrors | Error> => {
    try {
        const result = await createResponse({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newResponse =
                        data.createContractQuestionResponse.question
                            .responses[0]
                    const result =
                        cache.readQuery<FetchContractWithQuestionsQuery>({
                            query: FetchContractWithQuestionsDocument,
                            variables: {
                                input: {
                                    contractID: contractID,
                                },
                            },
                        })
                    const contract = result?.fetchContract.contract

                    if (contract) {
                        const questions =
                            contract.questions as IndexContractQuestionsPayload
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
                                                    __typename:
                                                        'ContractQuestionEdge',
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

        if (result.data?.createContractQuestionResponse) {
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

export const createRateQuestionResponseWrapper = async (
    createResponse: CreateRateQuestionResponseMutationFn,
    rateID: string,
    input: CreateQuestionResponseInput,
    division: Division
): Promise<CreateRateQuestionResponseMutation | GraphQLErrors | Error> => {
    try {
        const result = await createResponse({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newResponse =
                        data.createRateQuestionResponse.question.responses[0]
                    const result = cache.readQuery<FetchRateWithQuestionsQuery>(
                        {
                            query: FetchRateWithQuestionsDocument,
                            variables: {
                                input: {
                                    rateID: rateID,
                                },
                            },
                        }
                    )
                    const rate = result?.fetchRate.rate

                    if (rate) {
                        const questions =
                            rate.questions as IndexRateQuestionsPayload
                        const indexQuestionDivision =
                            divisionToIndexQuestionDivision(division)
                        const divisionQuestions =
                            questions[indexQuestionDivision]

                        const updatedRate = {
                            ...rate,
                            questions: {
                                ...rate.questions,
                                [indexQuestionDivision]: {
                                    ...divisionQuestions,
                                    edges: divisionQuestions.edges.map(
                                        (edge) => {
                                            if (
                                                edge.node.id ===
                                                newResponse.questionID
                                            ) {
                                                return {
                                                    __typename:
                                                        'RateQuestionEdge',
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
                            query: FetchRateWithQuestionsDocument,
                            data: {
                                fetchRate: {
                                    rate: updatedRate,
                                },
                            },
                        })
                    }
                }
            },
            onQueryUpdated: () => true,
        })

        if (result.data?.createRateQuestionResponse) {
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

// Legacy alias for backward compatibility
export const handleApolloErrorsAndAddUserFacingMessages = handleGraphQLErrorsAndAddUserFacingMessages
