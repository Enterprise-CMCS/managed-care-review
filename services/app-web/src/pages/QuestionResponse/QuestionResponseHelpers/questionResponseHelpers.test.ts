import { mockValidCMSUser, mockValidStateUser } from '@mc-review/mocks'
import {
    extractDocumentsFromQuestion,
    type QuestionType,
} from './questionResponseHelpers'

it('preserves canonical object keys for both question and response display documents', () => {
    const question: QuestionType = {
        __typename: 'ContractQuestion',
        id: 'question',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        addedBy: mockValidCMSUser(),
        division: 'DMCO',
        round: 1,
        documents: [
            {
                name: 'Question document',
                s3URL: 's3://bucket/old-question.pdf/question.pdf',
                s3Key: 'allusers/canonical-question.pdf',
                downloadURL: 'https://example.com/question',
            },
        ],
        responses: [
            {
                id: 'response',
                questionID: 'question',
                createdAt: new Date('2026-01-02T00:00:00Z'),
                addedBy: mockValidStateUser(),
                documents: [
                    {
                        name: 'Response document',
                        s3URL: 's3://bucket/old-response.pdf/response.pdf',
                        s3Key: 'allusers/canonical-response.pdf',
                        downloadURL: 'https://example.com/response',
                    },
                ],
            },
        ],
    }
    expect(extractDocumentsFromQuestion(question)).toEqual([
        expect.objectContaining({
            name: 'Response document',
            s3Key: 'allusers/canonical-response.pdf',
            responseID: 'response',
        }),
        expect.objectContaining({
            name: 'Question document',
            s3Key: 'allusers/canonical-question.pdf',
        }),
    ])
})
