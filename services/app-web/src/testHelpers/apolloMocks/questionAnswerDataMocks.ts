import { CmsUser, IndexQuestionsPayload } from '../../gen/gqlClient'
import { mockValidCMSUser } from './userGQLMock'

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
                        createdAt: new Date(),
                        addedBy: mockValidCMSUser() as CmsUser,
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/question-1-document-1',
                                name: 'question-1-document-1',
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
                        createdAt: new Date(),
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
