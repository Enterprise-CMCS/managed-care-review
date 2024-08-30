import { CmsUser, IndexQuestionsPayload, StateUser } from '../gen/gqlClient'
import { mockValidCMSUser, mockValidUser } from './userGQLMock'

function mockQuestionsPayload(contractID: string): IndexQuestionsPayload {
    return {
        DMCOQuestions: {
            totalCount: 2,
            edges: [
                {
                    __typename: 'QuestionEdge' as const,
                    node: {
                        __typename: 'Question' as const,
                        id: 'dmco-question-1-id',
                        contractID,
                        createdAt: new Date('2022-12-15'),
                        addedBy: mockValidCMSUser({
                            divisionAssignment: 'DMCO',
                        }) as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/dmco-question-1-document-1',
                                name: 'dmco-question-1-document-1',
                                downloadURL: expect.any(String),
                            },
                        ],
                        division: 'DMCO',
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-to-dmco-1-id',
                                questionID: 'dmco-question-1-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-16'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-to-dmco-1-document-1',
                                        name: 'response-to-dmco-1-document-1',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    __typename: 'QuestionEdge' as const,
                    node: {
                        __typename: 'Question' as const,
                        id: 'dmco-question-2-id',
                        contractID,
                        createdAt: new Date('2022-12-18'),
                        addedBy: mockValidCMSUser() as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/dmco-question-2-document-1',
                                name: 'dmco-question-2-document-1',
                                downloadURL: expect.any(String),
                            },
                            {
                                s3URL: 's3://bucketname/key/question-2-document-2',
                                name: 'dmco-question-2-document-2',
                                downloadURL: expect.any(String),
                            },
                        ],
                        division: 'DMCO',
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-to-dmco-2-id',
                                questionID: 'dmco-question-2-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-20'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-to-dmco-2-document-1',
                                        name: 'response-to-dmco-2-document-1',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
        DMCPQuestions: {
            totalCount: 1,
            edges: [
                {
                    __typename: 'QuestionEdge' as const,
                    node: {
                        __typename: 'Question' as const,
                        id: 'dmcp-question-1-id',
                        contractID,
                        createdAt: new Date('2022-12-15'),
                        addedBy: mockValidCMSUser({
                            divisionAssignment: 'DMCP',
                        }) as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/dmcp-question-1-document-1',
                                name: 'dmcp-question-1-document-1',
                                downloadURL: expect.any(String),
                            },
                        ],
                        division: 'DMCP',
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-to-dmcp-1-id',
                                questionID: 'dmcp-question-1-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-16'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-to-dmcp-1-document-1',
                                        name: 'response-to-dmcp-1-document-1',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
        OACTQuestions: {
            totalCount: 1,
            edges: [
                {
                    __typename: 'QuestionEdge' as const,
                    node: {
                        __typename: 'Question' as const,
                        id: 'oact-question-1-id',
                        contractID,
                        createdAt: new Date('2022-12-15'),
                        addedBy: mockValidCMSUser({
                            divisionAssignment: 'OACT',
                        }) as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/oact-question-1-document-1',
                                name: 'oact-question-1-document-1',
                                downloadURL: expect.any(String),
                            },
                        ],
                        division: 'OACT',
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-to-oact-1-id',
                                questionID: 'oact-question-1-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-16'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-to-oact-1-document-1',
                                        name: 'response-to-oact-1-document-1',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
    }
}

export { mockQuestionsPayload }
