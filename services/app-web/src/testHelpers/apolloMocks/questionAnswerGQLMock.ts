import { MockedResponse } from '@apollo/client/testing'
import {
    CreateQuestionDocument,
    CreateQuestionInput,
    CreateQuestionMutation,
    Question as QuestionType,
} from '../../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'

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

export { createQuestionNetworkFailure, createQuestionSuccess }
