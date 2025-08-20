import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { FetchDocumentDocument } from '../../gen/gqlClient'
import { createAndUpdateTestContractWithoutRates } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'

describe('fetchDocument', () => {
    const mockS3 = testS3Client()

    it('fetch document without error', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const doc = stateSubmission.draftRevision?.formData.contractDocuments[0]
        // Create OAuth client context

        const fetchResult = await stateServer.executeOperation({
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                },
            },
        })

        expect(fetchResult.errors).toBeUndefined()
        expect(fetchResult.data?.fetchDocument.document).toBeDefined()
        expect(fetchResult.data?.fetchDocument.document.id).toBe(doc!.id)
    })

    it('Not found error with bad document id', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const fetchResult = await stateServer.executeOperation({
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: 'bad_id',
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('NOT_FOUND')
        expect(fetchResult.errors[0].message).toBe(
            'Issue finding document message: PRISMA ERROR: Cannot find document with id: bad_id'
        )
    })

    it('Bad input error with expiresIn field that exceeds threshold', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const doc = stateSubmission.draftRevision?.formData.contractDocuments[0]

        const fetchResult = await stateServer.executeOperation({
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                    expiresIn: 900000000,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(fetchResult.errors[0].message).toBe(
            'expiresIn field cannot exceed 604,800 seconds (1 week). currently set to 900000000'
        )
    })
})
