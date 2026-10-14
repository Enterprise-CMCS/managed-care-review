import { ApolloServer } from '@apollo/server'
import typeDefs from 'app-graphql/src/schema.graphql'
import { GenerateUploadUrlDocument } from '../../gen/gqlClient'
import type { GenerateUploadUrlInput } from '../../gen/gqlServer'
import type { Context } from '../../handlers/apollo_gql'
import type { Store } from '../../postgres'
import { testS3Client } from '../../testHelpers/s3Helpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { generateUploadURLResolver } from './generateUploadURL'

describe('generateUploadURLResolver', () => {
    const user = testCMSUser()
    const mockS3 = testS3Client()
    // This endpoint does not use the store; exercise its real schema without a database.
    const server = new ApolloServer<Context>({
        typeDefs,
        resolvers: {
            Mutation: {
                generateUploadURL: generateUploadURLResolver(
                    {} as Store,
                    mockS3,
                    testLDService()
                ),
            },
        },
    })
    const executeUpload = async (input: GenerateUploadUrlInput) =>
        extractGraphQLResponse(
            await server.executeOperation(
                {
                    query: GenerateUploadUrlDocument,
                    variables: { input },
                },
                { contextValue: { user } }
            )
        )
    afterAll(() => server.stop())

    it('returns a valid presigned URL for a Word doc', async () => {
        const signing = vi.spyOn(mockS3, 'getUploadURL')
        const result = await executeUpload({
            fileName: 'test-doc.docx',
            fileType: 'DOCX',
            bucketName: 'QUESTION_ANSWER_DOCS',
        })

        expect(result.errors).toBeUndefined()
        const payload = result.data?.generateUploadURL
        expect(payload?.uploadURL).toContain('.docx')
        expect(payload?.expiresIn).toBeDefined()
        expect(payload?.s3URL).toBeDefined()
        expect(payload?.contentType).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        expect(signing).toHaveBeenLastCalledWith(
            expect.any(String),
            'QUESTION_ANSWER_DOCS',
            payload?.contentType,
            300,
            undefined
        )
    })

    it('only signs attachment metadata when the caller opts in', async () => {
        const signing = vi.spyOn(mockS3, 'getUploadURL')
        const result = await executeUpload({
            fileName: 'report name.pdf',
            fileType: 'PDF',
            bucketName: 'HEALTH_PLAN_DOCS',
            includeContentDisposition: true,
        })
        expect(result.errors).toBeUndefined()
        expect(signing).toHaveBeenLastCalledWith(
            expect.any(String),
            'HEALTH_PLAN_DOCS',
            'application/pdf',
            300,
            'report name.pdf'
        )
    })

    it.each(['XLSX', 'XLSM', 'XLTM', 'XLAM'] as const)(
        'returns a valid presigned URL for %s spreadsheets',
        async (fileType) => {
            const result = await executeUpload({
                fileName: `test-sheet.${fileType.toLowerCase()}`,
                fileType,
                bucketName: 'QUESTION_ANSWER_DOCS',
            })

            expect(result.errors).toBeUndefined()
            const payload = result.data?.generateUploadURL
            expect(payload).toBeDefined()
            expect(payload?.uploadURL).toContain(`.${fileType.toLowerCase()}`)
            expect(payload?.expiresIn).toBeDefined()
            expect(payload?.s3URL).toBeDefined()
        }
    )

    it('throws an error when file name is missing', async () => {
        const result = await executeUpload({
            fileName: '',
            fileType: 'PDF',
            bucketName: 'QUESTION_ANSWER_DOCS',
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toMatch('file name cannot be blank')
    })

    it('throws an error when fileType does not match file extension', async () => {
        const result = await executeUpload({
            fileName: 'test.doc',
            fileType: 'PDF',
            bucketName: 'QUESTION_ANSWER_DOCS',
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toMatch(
            'File extension ".doc" does not match fileType "PDF"'
        )
    })
})
