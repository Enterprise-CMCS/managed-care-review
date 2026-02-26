import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { FetchDocumentDocument } from '../../gen/gqlClient'
import { createAndUpdateTestContractWithoutRates } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'

describe('fetchDocument', () => {
    const mockS3 = testS3Client()

    it('fetch document without error', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const doc = stateSubmission.draftRevision?.formData.contractDocuments[0]

        const fetchResult = await executeGraphQLOperation(stateServer, {
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                    documentType: 'CONTRACT_DOC',
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

        const fetchResult = await executeGraphQLOperation(stateServer, {
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: 'bad_id',
                    documentType: 'CONTRACT_DOC',
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('NOT_FOUND')
        expect(fetchResult.errors[0].message).toBe(
            'Issue finding document message: PRISMA ERROR: Cannot find contract document with id: bad_id'
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

        const fetchResult = await executeGraphQLOperation(stateServer, {
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                    documentType: 'CONTRACT_DOC',
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
            'expiresIn field must be in range: 1 - 604,800 seconds (1 week). currently set to 900000000'
        )
    })

    it('Bad input error with expiresIn field does not meet threshold', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const doc = stateSubmission.draftRevision?.formData.contractDocuments[0]

        const fetchResult = await executeGraphQLOperation(stateServer, {
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                    documentType: 'CONTRACT_DOC',
                    expiresIn: 0,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(fetchResult.errors[0].message).toBe(
            'expiresIn field must be in range: 1 - 604,800 seconds (1 week). currently set to 0'
        )
    })

    it('denies OAuth client without read permissions', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Create a contract
        const stateSubmission =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // Create OAuth client context without client_credentials grant
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['some_other_grant'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            s3Client: mockS3,
        })

        const doc = stateSubmission.draftRevision?.formData.contractDocuments[0]

        const fetchResult = await executeGraphQLOperation(oauthServer, {
            query: FetchDocumentDocument,
            variables: {
                input: {
                    documentID: doc!.id,
                    documentType: 'CONTRACT_DOC',
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'OAuth client does not have read permissions'
        )
    })
})
