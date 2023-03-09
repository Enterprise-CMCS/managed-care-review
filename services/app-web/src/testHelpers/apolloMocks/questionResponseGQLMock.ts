import { MockedResponse } from '@apollo/client/testing'
import {
    CreateQuestionDocument,
    CreateQuestionInput,
    CreateQuestionMutation,
    Question as QuestionType,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsQuery,
    HealthPlanPackage,
    IndexQuestionsPayload,
} from '../../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'
import { mockSubmittedHealthPlanPackage, mockQuestionsPayload } from './'

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
    return {
        request: {
            query: FetchHealthPlanPackageWithQuestionsDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: undefined,
                },
            },
        },
    }
}

export {
    createQuestionNetworkFailure,
    createQuestionSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockNotFound,
}
