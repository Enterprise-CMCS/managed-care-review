import { MockedResponse } from '@apollo/client/testing'
import {
    CreateContractQuestionDocument,
    CreateContractQuestionResponseDocument,
    CreateContractQuestionInput,
    CreateContractQuestionMutation,
    QuestionResponse as QuestionResponseType,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsQuery,
    HealthPlanPackage,
    IndexContractQuestionsPayload,
    CreateRateQuestionInput,
    CreateRateQuestionMutation,
    CreateRateQuestionDocument,
} from '../../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'
import { mockSubmittedHealthPlanPackage, mockQuestionsPayload } from './'
import { GraphQLError } from 'graphql'

type fetchStateHealthPlanPackageWithQuestionsProps = {
    stateSubmission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    questions?: IndexContractQuestionsPayload
}

const createContractQuestionSuccess = (
    question?: CreateContractQuestionInput | Partial<CreateContractQuestionInput>
): MockedResponse<CreateContractQuestionMutation> => {
    const defaultQuestionInput: CreateContractQuestionInput = {
        // dueDate: new Date('11-11-2100'),
        contractID: '123-abc',
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
            query: CreateContractQuestionDocument,
            variables: { input: testInput },
        },
        result: {
            data: {
                createContractQuestion: {
                    question: {
                        id: 'test123',
                        contractID: testInput.contractID,
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

const createContractQuestionNetworkFailure = (
    input: CreateContractQuestionInput
): MockedResponse<CreateContractQuestionMutation> => {
    return {
        request: {
            query: CreateContractQuestionDocument,
            variables: { input },
        },
        error: new Error('A network error occurred'),
    }
}


const createRateQuestionSuccess = (
    question?: CreateRateQuestionInput | Partial<CreateRateQuestionInput>
): MockedResponse<CreateRateQuestionMutation> => {
    const defaultQuestionInput: CreateRateQuestionInput = {
        // dueDate: new Date('11-11-2100'),
        rateID: '123-abc',
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
            query: CreateRateQuestionDocument,
            variables: { input: testInput },
        },
        result: {
            data: {
                createRateQuestion: {
                    question: {
                        id: 'test123',
                        rateID: testInput.rateID,
                        addedBy: mockValidCMSUser(),
                        division: 'DMCO',
                        documents: testInput.documents,
                    },
                },
            },
        },
    }
}

const createRateQuestionNetworkFailure = (
    input: CreateRateQuestionInput
): MockedResponse<CreateRateQuestionMutation> => {
    return {
        request: {
            query: CreateRateQuestionDocument,
            variables: { input },
        },
        error: new Error('A network error occurred'),
    }
}

const createContractQuestionResponseNetworkFailure = (
    _question?: QuestionResponseType | Partial<QuestionResponseType>
): MockedResponse<CreateContractQuestionMutation> => {
    return {
        request: { query: CreateContractQuestionResponseDocument },
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
    createContractQuestionNetworkFailure,
    createContractQuestionResponseNetworkFailure,
    createContractQuestionSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockNotFound,
    createRateQuestionNetworkFailure,
    createRateQuestionSuccess,
}
