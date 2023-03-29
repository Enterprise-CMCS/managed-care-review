import {
    CreateQuestionMutationFn,
    HealthPlanPackage,
    SubmitHealthPlanPackageMutationFn,
    UnlockHealthPlanPackageMutationFn,
    Document,
    FetchHealthPlanPackageWithQuestionsQuery,
    FetchHealthPlanPackageWithQuestionsDocument,
    IndexQuestionsPayload,
    CreateQuestionMutation,
    CreateQuestionResponseMutationFn,
    CreateQuestionResponseMutation,
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

const handleApolloErrorsAndAddUserFacingMessages = (
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
                extensions.code === 'INVALID_PACKAGE_STATUS' &&
                mutation === 'UNLOCK_HEALTH_PLAN_PACKAGE'
            ) {
                message = ERROR_MESSAGES.unlock_invalid_package_status // / TODO: This is should be a custom ApolloError such as INVALID_PACKAGE_STATUS or ACTION_UNAVAILABLE, not user input error since doesn't involve form fields the user controls
                options.cause = extensions.code
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

export const createQuestionWrapper = async (
    createQuestion: CreateQuestionMutationFn,
    input: {
        pkgID: string
        documents: Document[]
    }
): Promise<CreateQuestionMutation | GraphQLErrors | Error> => {
    try {
        const result = await createQuestion({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newQuestion = data.createQuestion.question
                    const result =
                        cache.readQuery<FetchHealthPlanPackageWithQuestionsQuery>(
                            {
                                query: FetchHealthPlanPackageWithQuestionsDocument,
                                variables: {
                                    input: {
                                        pkgID: newQuestion.pkgID,
                                    },
                                },
                            }
                        )

                    const pkg = result?.fetchHealthPlanPackage.pkg

                    if (pkg) {
                        const questions = pkg.questions as IndexQuestionsPayload
                        const updatedPkg = {
                            ...pkg,
                            questions: {
                                ...pkg.questions,
                                DMCOQuestions: {
                                    totalCount: questions.DMCPQuestions
                                        .totalCount
                                        ? questions.DMCPQuestions.totalCount + 1
                                        : 1,
                                    edges: [
                                        {
                                            __typename: 'QuestionEdge',
                                            node: {
                                                ...newQuestion,
                                                responses: [],
                                            },
                                        },
                                        ...questions.DMCOQuestions.edges,
                                    ],
                                },
                            },
                        }

                        cache.writeQuery({
                            query: FetchHealthPlanPackageWithQuestionsDocument,
                            data: {
                                fetchHealthPlanPackage: {
                                    pkg: updatedPkg,
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
    pkgID: string,
    input: {
        questionID: string
        documents: Document[]
    }
): Promise<CreateQuestionResponseMutation | GraphQLErrors | Error> => {
    try {
        const result = await createResponse({
            variables: { input },
            update(cache, { data }) {
                if (data) {
                    const newResponse = data.createQuestionResponse.response
                    const result =
                        cache.readQuery<FetchHealthPlanPackageWithQuestionsQuery>(
                            {
                                query: FetchHealthPlanPackageWithQuestionsDocument,
                                variables: {
                                    input: {
                                        pkgID: pkgID,
                                    },
                                },
                            }
                        )

                    const pkg = result?.fetchHealthPlanPackage.pkg

                    if (pkg) {
                        const updatedQuestionsEdge =
                            pkg.questions?.DMCOQuestions.edges.map((edge) => {
                                if (edge.node.id === newResponse.questionID) {
                                    return {
                                        __typename: 'QuestionEdge',
                                        node: {
                                            ...edge.node,
                                            responses: [
                                                newResponse,
                                                ...edge.node.responses,
                                            ],
                                        },
                                    }
                                }
                                return edge
                            })

                        const updatedPkg = {
                            ...pkg,
                            questions: {
                                ...pkg.questions,
                                DMCOQuestions: {
                                    ...pkg.questions?.DMCOQuestions,
                                    edges: updatedQuestionsEdge,
                                },
                            },
                        }

                        cache.writeQuery({
                            query: FetchHealthPlanPackageWithQuestionsDocument,
                            data: {
                                fetchHealthPlanPackage: {
                                    pkg: updatedPkg,
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
