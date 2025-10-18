import { MockedResponse } from '@apollo/client/testing'
import {
    CreateContractQuestionDocument,
    CreateContractQuestionResponseDocument,
    CreateContractQuestionInput,
    CreateContractQuestionMutation,
    QuestionResponse as QuestionResponseType,
    HealthPlanPackage,
    IndexContractQuestionsPayload,
    CreateRateQuestionInput,
    CreateRateQuestionMutation,
    CreateRateQuestionDocument,
    CreateRateQuestionResponseMutation,
    CreateRateQuestionResponseDocument,
} from '../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'

type fetchStateHealthPlanPackageWithQuestionsProps = {
    stateSubmission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    questions?: IndexContractQuestionsPayload
}

const createContractQuestionSuccess = (
    question?:
        | CreateContractQuestionInput
        | Partial<CreateContractQuestionInput>
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
                        documents: testInput.documents.map(doc => ({
                            ...doc,
                            id: doc.name,
                        })),
                        round: 1,
                        responses: []
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
                        createdAt: new Date(),
                        rateID: testInput.rateID,
                        addedBy: mockValidCMSUser(),
                        division: 'DMCO',
                        round: 1,
                        documents: testInput.documents.map(doc => ({
                            ...doc,
                            id: doc.name,
                        })),
                        responses: []
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

const createRateQuestionResponseNetworkFailure = (
    _question?: QuestionResponseType | Partial<QuestionResponseType>
): MockedResponse<CreateRateQuestionResponseMutation> => {
    return {
        request: { query: CreateRateQuestionResponseDocument },
        error: new Error('A network error occurred'),
    }
}


export {
    createContractQuestionNetworkFailure,
    createContractQuestionResponseNetworkFailure,
    createContractQuestionSuccess,
    createRateQuestionNetworkFailure,
    createRateQuestionResponseNetworkFailure,
    createRateQuestionSuccess,
}
