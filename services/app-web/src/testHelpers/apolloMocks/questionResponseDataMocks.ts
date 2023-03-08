import { CmsUser, IndexQuestionsPayload, StateUser } from '../../gen/gqlClient'
import { mockValidCMSUser, mockValidUser } from './userGQLMock'

function mockQuestionsPayload(pkgID: string): IndexQuestionsPayload {
    return {
        DMCOQuestions: {
            totalCount: 2,
            edges: [
                {
                    __typename: 'QuestionEdge' as const,
                    node: {
                        __typename: 'Question' as const,
                        id: 'question-1-id',
                        pkgID,
                        createdAt: new Date('2022-12-15'),
                        addedBy: mockValidCMSUser() as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/question-1-document-1',
                                name: 'question-1-document-1',
                            },
                        ],
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-1-id',
                                questionID: 'question-1-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-16'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-1-document-1',
                                        name: 'response-1-document-1',
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
                        id: 'question-2-id',
                        pkgID,
                        createdAt: new Date('2022-12-18'),
                        addedBy: mockValidCMSUser() as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/question-2-document-1',
                                name: 'question-2-document-1',
                            },
                            {
                                s3URL: 's3://bucketname/key/question-2-document-2',
                                name: 'question-2-document-2',
                            },
                        ],
                        responses: [
                            {
                                __typename: 'QuestionResponse' as const,
                                id: 'response-2-id',
                                questionID: 'question-2-id',
                                addedBy: mockValidUser() as StateUser,
                                createdAt: new Date('2022-12-20'),
                                documents: [
                                    {
                                        s3URL: 's3://bucketname/key/response-2-document-1',
                                        name: 'response-2-document-1',
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
        DMCPQuestions: {
            totalCount: 0,
            edges: [],
        },
        OACTQuestions: {
            totalCount: 0,
            edges: [],
        },
    }
}

export { mockQuestionsPayload }
