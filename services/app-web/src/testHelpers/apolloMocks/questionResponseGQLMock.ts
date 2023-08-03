import { MockedResponse } from '@apollo/client/testing'
import {
    CreateQuestionDocument,
    CreateQuestionResponseDocument,
    CreateQuestionInput,
    CreateQuestionMutation,
    Question as QuestionType,
    QuestionResponse as QuestionResponseType,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsQuery,
    HealthPlanPackage,
    IndexQuestionsPayload,
} from '../../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'
import { mockSubmittedHealthPlanPackage, mockQuestionsPayload } from './'
import { GraphQLError } from 'graphql'

type fetchStateHealthPlanPackageWithQuestionsProps = {
    stateSubmission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    questions?: IndexQuestionsPayload
}

const createQuestionSuccess = (
    question?: CreateQuestionInput | Partial<CreateQuestionInput>
): MockedResponse<CreateQuestionMutation> => {
    const defaultQuestionInput: CreateQuestionInput = {
        dueDate: new Date('11-11-2100'),
        pkgID: '123-abc',
        documents: [
            {
                name: 'Test document',
                s3URL: 's3://test-document.doc',
            },
        ],
    }

    const testInput = { ...defaultQuestionInput, ...question }

    return {
        request: {
            query: CreateQuestionDocument,
            variables: { input: testInput },
        },
        result: {
            data: {
                createQuestion: {
                    question: {
                        id: 'test123',
                        pkgID: testInput.pkgID,
                        createdAt: new Date(),
                        addedBy: mockValidCMSUser(),
                        division: 'DMCO',
                        documents: testInput.documents,
                    },
                },
            },
        },
    }
}

const createQuestionNetworkFailure = (
    question?: QuestionType | Partial<QuestionType>
): MockedResponse<CreateQuestionMutation> => {
    return {
        request: { query: CreateQuestionDocument },
        error: new Error('A network error occurred'),
    }
}
const createQuestionResponseNetworkFailure = (
    question?: QuestionResponseType | Partial<QuestionResponseType>
): MockedResponse<CreateQuestionMutation> => {
    return {
        request: { query: CreateQuestionResponseDocument },
        error: new Error('A network error occurred'),
    }
}

const fetchStateHealthPlanPackageWithQuestionsMockSuccess = ({
    stateSubmission = mockSubmittedHealthPlanPackage(),
    id,
    questions,
}: fetchStateHealthPlanPackageWithQuestionsProps): MockedResponse<
    Record<string, unknown>
> => {
    const questionPayload = questions || mockQuestionsPayload(id)
    const pkg = {
        ...stateSubmission,
        questions: questionPayload,
    }

    // override the ID of the returned draft to match the queried id.
    const mergedStateSubmission = Object.assign({}, pkg, { id })

    return {
        request: {
            query: FetchHealthPlanPackageWithQuestionsDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: mergedStateSubmission,
                },
            },
        },
    }
}

const fetchStateHealthPlanPackageWithQuestionsMockNotFound = ({
    id,
}: fetchStateHealthPlanPackageWithQuestionsProps): MockedResponse<FetchHealthPlanPackageWithQuestionsQuery> => {
    const graphQLError = new GraphQLError(
        'Issue finding a package with id a6039ed6-39cc-4814-8eaa-0c99f25e325d. Message: Result was undefined.',
        {
            extensions: {
                code: 'NOT_FOUND',
            },
        }
    )

    return {
        request: {
            query: FetchHealthPlanPackageWithQuestionsDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            errors: [graphQLError],
        },
    }
}

export {
    createQuestionNetworkFailure,
    createQuestionResponseNetworkFailure,
    createQuestionSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockNotFound,
}
