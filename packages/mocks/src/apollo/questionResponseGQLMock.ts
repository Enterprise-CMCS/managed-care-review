import { MockLink } from '@apollo/client/testing'
import {
    CreateContractQuestionDocument,
    CreateContractQuestionResponseDocument,
    CreateContractQuestionInput,
    CreateContractQuestionMutation,
    QuestionResponse as QuestionResponseType,
    CreateRateQuestionInput,
    CreateRateQuestionMutation,
    CreateRateQuestionDocument,
    CreateRateQuestionResponseMutation,
    CreateRateQuestionResponseDocument,
    DeleteContractQuestionDocument,
    DeleteContractQuestionInput,
    DeleteContractQuestionMutation,
    DeleteContractQuestionResponseDocument,
    DeleteContractQuestionResponseInput,
    DeleteContractQuestionResponseMutation,
    Division,
} from '../gen/gqlClient'
import { mockValidAdminUser, mockValidCMSUser } from './userGQLMock'

const createContractQuestionSuccess = (
    question?:
        | CreateContractQuestionInput
        | Partial<CreateContractQuestionInput>
): MockLink.MockedResponse<CreateContractQuestionMutation> => {
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
                        documents: testInput.documents.map((doc) => ({
                            ...doc,
                            id: doc.name,
                        })),
                        round: 1,
                        responses: [],
                    },
                },
            },
        },
    }
}

const createContractQuestionNetworkFailure = (
    input: CreateContractQuestionInput
): MockLink.MockedResponse<CreateContractQuestionMutation> => {
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
): MockLink.MockedResponse<CreateRateQuestionMutation> => {
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
                        documents: testInput.documents.map((doc) => ({
                            ...doc,
                            id: doc.name,
                        })),
                        responses: [],
                    },
                },
            },
        },
    }
}

const createRateQuestionNetworkFailure = (
    input: CreateRateQuestionInput
): MockLink.MockedResponse<CreateRateQuestionMutation> => {
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
): MockLink.MockedResponse<CreateContractQuestionMutation> => {
    return {
        request: { query: CreateContractQuestionResponseDocument },
        error: new Error('A network error occurred'),
    }
}

const createRateQuestionResponseNetworkFailure = (
    _question?: QuestionResponseType | Partial<QuestionResponseType>
): MockLink.MockedResponse<CreateRateQuestionResponseMutation> => {
    return {
        request: { query: CreateRateQuestionResponseDocument },
        error: new Error('A network error occurred'),
    }
}

const deleteContractQuestionMockSuccess = (
    overrides?: Partial<DeleteContractQuestionInput> & {
        contractID?: string
        division?: Division
    }
): MockLink.MockedResponse<DeleteContractQuestionMutation> => {
    const input: DeleteContractQuestionInput = {
        questionID: overrides?.questionID ?? 'dmco-question-1-id',
        reason: overrides?.reason ?? 'no longer applicable',
    }
    const contractID = overrides?.contractID ?? 'test-abc-123'
    const division = overrides?.division ?? 'DMCO'

    return {
        request: {
            query: DeleteContractQuestionDocument,
            variables: { input },
        },
        result: {
            data: {
                deleteContractQuestion: {
                    question: {
                        __typename: 'ContractQuestion',
                        id: input.questionID,
                        contractID,
                        createdAt: new Date('2022-12-16'),
                        addedBy: mockValidCMSUser(),
                        division,
                        round: 1,
                        documents: [
                            {
                                id: `${input.questionID}-document-1`,
                                s3URL: `s3://bucketname/key/${input.questionID}-document-1`,
                                name: `${input.questionID}-document-1`,
                                downloadURL: 'https://example.com',
                            },
                        ],
                        responses: [],
                        actions: [
                            {
                                __typename: 'QuestionAction',
                                id: 'delete-action-1',
                                createdAt: new Date(),
                                action: 'DELETE',
                                reason: input.reason,
                                updatedBy: mockValidAdminUser(),
                            },
                        ],
                    },
                },
            },
        },
    }
}

const deleteContractQuestionMockNetworkFailure = (
    input?: Partial<DeleteContractQuestionInput>
): MockLink.MockedResponse<DeleteContractQuestionMutation> => {
    return {
        request: {
            query: DeleteContractQuestionDocument,
            variables: input ? { input } : undefined,
        },
        error: new Error('A network error occurred'),
    }
}

const deleteContractQuestionResponseMockSuccess = (
    overrides?: Partial<DeleteContractQuestionResponseInput> & {
        contractID?: string
        questionID?: string
        division?: Division
    }
): MockLink.MockedResponse<DeleteContractQuestionResponseMutation> => {
    const input: DeleteContractQuestionResponseInput = {
        responseID: overrides?.responseID ?? 'response-to-dmco-1-id',
        reason: overrides?.reason ?? 'no longer applicable',
    }
    const contractID = overrides?.contractID ?? 'test-abc-123'
    const questionID = overrides?.questionID ?? 'dmco-question-1-id'
    const division = overrides?.division ?? 'DMCO'

    return {
        request: {
            query: DeleteContractQuestionResponseDocument,
            variables: { input },
        },
        result: {
            data: {
                deleteContractQuestionResponse: {
                    question: {
                        __typename: 'ContractQuestion',
                        id: questionID,
                        contractID,
                        createdAt: new Date('2022-12-16'),
                        addedBy: mockValidCMSUser(),
                        division,
                        round: 1,
                        documents: [
                            {
                                id: `${questionID}-document-1`,
                                s3URL: `s3://bucketname/key/${questionID}-document-1`,
                                name: `${questionID}-document-1`,
                                downloadURL: 'https://example.com',
                            },
                        ],
                        // The deleted response is filtered out of subsequent reads.
                        responses: [],
                        actions: [],
                    },
                },
            },
        },
    }
}

const deleteContractQuestionResponseMockNetworkFailure = (
    input?: Partial<DeleteContractQuestionResponseInput>
): MockLink.MockedResponse<DeleteContractQuestionResponseMutation> => {
    return {
        request: {
            query: DeleteContractQuestionResponseDocument,
            variables: input ? { input } : undefined,
        },
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
    deleteContractQuestionMockSuccess,
    deleteContractQuestionMockNetworkFailure,
    deleteContractQuestionResponseMockSuccess,
    deleteContractQuestionResponseMockNetworkFailure,
}
