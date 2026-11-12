import { ApolloServer } from '@apollo/server'
import type { DocumentNode } from 'graphql'
import typeDefs from 'app-graphql/src/schema.graphql'
import {
    FetchS3DownloadUrlDocument,
    FetchUploadScanStatusDocument,
} from '../../gen/gqlClient'
import type { Context } from '../../handlers/apollo_gql'
import type { Store } from '../../postgres'
import type { Emailer } from '../../emailer'
import type { DocumentZipService } from '../../zip/generateZip'
import { configureResolvers } from '../configureResolvers'
import { testS3Client } from '../../testHelpers/s3Helpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'

const context: Context = {
    user: {
        id: 'cms-user',
        role: 'CMS_USER',
        email: 'cms@example.com',
        givenName: 'CMS',
        familyName: 'User',
        stateAssignments: [],
    },
}

// Use the real schema and configureResolvers so missing query registration or
// invalid GraphQL inputs fail the tests. These operations do not use the database;
// the other resolver dependencies are placeholders that must remain unused.
const s3 = testS3Client()
const server = new ApolloServer<Context>({
    typeDefs,
    resolvers: configureResolvers(
        {} as Store,
        {} as Emailer,
        testLDService(),
        s3,
        'http://localhost:3000',
        {} as DocumentZipService
    ),
})
const operations = [FetchUploadScanStatusDocument, FetchS3DownloadUrlDocument]
const input = { key: 'allusers/upload.pdf', bucketName: 'QUESTION_ANSWER_DOCS' }
const execute = async (
    query: DocumentNode,
    objectInput: unknown = input,
    requestContext = context
) =>
    extractGraphQLResponse<{
        fetchUploadScanStatus?: string
        fetchS3DownloadURL?: string
    }>(
        await server.executeOperation(
            { query, variables: { input: objectInput } },
            { contextValue: requestContext }
        )
    )

beforeEach(() => vi.restoreAllMocks())
afterAll(() => server.stop())

describe('shared browser S3 queries', () => {
    it.each(['PENDING', 'CLEAN', 'INFECTED', 'ERROR'] as const)(
        'serializes %s for an unsaved upload without downloading bytes',
        async (status) => {
            const scan = vi.spyOn(s3, 'getScanStatus').mockResolvedValue(status)
            const download = vi.spyOn(s3, 'getURL')
            const result = await execute(FetchUploadScanStatusDocument)
            expect(result.errors).toBeUndefined()
            expect(result.data?.fetchUploadScanStatus).toBe(status)
            expect(scan).toHaveBeenCalledWith(
                'upload.pdf',
                'QUESTION_ANSWER_DOCS'
            )
            expect(download).not.toHaveBeenCalled()
        }
    )

    it.each(['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'])(
        'signs flat shared downloads in %s',
        async (bucketName) => {
            const sign = vi.spyOn(s3, 'getURL')
            for (const key of ['upload.pdf', 'allusers/upload.pdf']) {
                const result = await execute(FetchS3DownloadUrlDocument, {
                    key,
                    bucketName,
                })
                expect(result.errors).toBeUndefined()
                expect(result.data?.fetchS3DownloadURL).toContain('upload.pdf')
                expect(sign).toHaveBeenLastCalledWith(
                    'upload.pdf',
                    bucketName,
                    3600
                )
            }
        }
    )

    // Every authenticated human role can access the same shared object key.
    // This checks that roles remain supported, not that users are prevented from
    // downloading documents belonging to another state or package.
    const identity = {
        id: 'human-user',
        email: 'human@example.com',
        givenName: 'Human',
        familyName: 'User',
    }
    const humanUsers: Context['user'][] = [
        { ...identity, role: 'STATE_USER', stateCode: 'VA' },
        { ...identity, role: 'CMS_USER', stateAssignments: [] },
        { ...identity, role: 'CMS_APPROVER_USER', stateAssignments: [] },
        { ...identity, role: 'ADMIN_USER' },
        { ...identity, role: 'HELPDESK_USER' },
        { ...identity, role: 'BUSINESSOWNER_USER' },
        { ...identity, role: 'READONLY_USER' },
    ]
    it.each(humanUsers)(
        'preserves authenticated $role shared-object access',
        async (user) => {
            for (const operation of operations) {
                expect(
                    (await execute(operation, input, { user })).errors
                ).toBeUndefined()
            }
        }
    )

    it.each([
        '',
        'allusers/',
        '.',
        '..',
        '../secret.pdf',
        'private/secret.pdf',
        'allusers/../secret.pdf',
        'allusers/folder/file.pdf',
        'allusers\\file.pdf',
        'file\u0000.pdf',
        'file\n.pdf',
        'zips/contracts/other-revision/contract-documents.zip',
        'zips/rates/other-revision/rate-documents.zip',
        `${'é'.repeat(506)}.pdf`,
    ])('rejects invalid or non-flat keys before S3: %j', async (key) => {
        const scan = vi.spyOn(s3, 'getScanStatus')
        const sign = vi.spyOn(s3, 'getURL')
        const zip = vi.spyOn(s3, 'getZipURL')
        for (const operation of operations) {
            const result = await execute(operation, { ...input, key })
            expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        }
        expect(scan).not.toHaveBeenCalled()
        expect(sign).not.toHaveBeenCalled()
        expect(zip).not.toHaveBeenCalled()
    })

    it('accepts the S3 UTF-8 byte-length boundary including allusers/', async () => {
        const key = `${'a'.repeat(1011)}.pdf`
        expect(Buffer.byteLength(`allusers/${key}`)).toBe(1024)
        expect(
            (await execute(FetchUploadScanStatusDocument, { ...input, key }))
                .errors
        ).toBeUndefined()
        const result = await execute(FetchUploadScanStatusDocument, {
            ...input,
            key: `${key}a`,
        })
        expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
    })

    it('rejects unknown bucket enum values at the schema boundary', async () => {
        const scan = vi.spyOn(s3, 'getScanStatus')
        const sign = vi.spyOn(s3, 'getURL')
        for (const operation of operations) {
            const result = await execute(operation, {
                ...input,
                bucketName: 'ARBITRARY_BUCKET',
            })
            expect(result.errors).toHaveLength(1)
        }
        expect(scan).not.toHaveBeenCalled()
        expect(sign).not.toHaveBeenCalled()
    })

    // These permissions can authorize uploads elsewhere. They must not also
    // unlock these separate queries for scanning or downloading arbitrary keys.
    it.each([
        { grants: [], scopes: [], isDelegatedUser: false },
        { grants: ['client_credentials'], scopes: [], isDelegatedUser: false },
        {
            grants: ['client_credentials'],
            scopes: ['CMS_SUBMISSION_ACTIONS'],
            isDelegatedUser: true,
        },
        {
            grants: ['client_credentials'],
            scopes: ['ADMIN_SUBMISSION_ACTIONS'],
            isDelegatedUser: false,
        },
        {
            grants: ['client_credentials'],
            scopes: ['SYNTHETIC_DATA_WRITE'],
            isDelegatedUser: false,
        },
    ])(
        'rejects machine/delegated contexts before S3: %j',
        async (permissions) => {
            const denied: Context = {
                ...context,
                oauthClient: {
                    clientId: 'client',
                    iss: 'issuer',
                    ...permissions,
                },
            }
            const scan = vi.spyOn(s3, 'getScanStatus')
            const sign = vi.spyOn(s3, 'getURL')
            for (const operation of operations) {
                const result = await execute(operation, input, denied)
                expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN')
            }
            expect(scan).not.toHaveBeenCalled()
            expect(sign).not.toHaveBeenCalled()
        }
    )

    it('propagates tag lookup failures rather than returning clean or pending', async () => {
        vi.spyOn(s3, 'getScanStatus').mockRejectedValue(
            new Error('AccessDenied')
        )
        const result = await execute(FetchUploadScanStatusDocument)
        expect(result.errors?.[0].extensions?.code).toBe(
            'INTERNAL_SERVER_ERROR'
        )
        expect(result.data).toBeNull()
    })
})
