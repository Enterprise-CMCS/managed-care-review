import { GenerateUploadUrlDocument } from "../../gen/gqlClient"
import { testS3Client } from "../../testHelpers"
import { constructTestPostgresServer, executeGraphQLOperation } from "../../testHelpers/gqlHelpers"
import { testCMSUser } from "../../testHelpers/userHelpers"

describe(`generateUploadURLResolver`, () => {
    const user = testCMSUser()
    const mockS3 = testS3Client()

    let server: Awaited<ReturnType<typeof constructTestPostgresServer>>

    beforeAll(async () => {
        server = await constructTestPostgresServer({
            context: { user },
            s3Client: mockS3,
        })
    })

    it('returns a valid presigned URL for a Word doc', async () => {      
        const result = await executeGraphQLOperation(server, {
            query: GenerateUploadUrlDocument,
            variables: {
                input: {
                    fileName: 'test-doc.docx',
                    fileType: 'DOCX',
                },
            },
        })

        expect(result.errors).toBeUndefined()
        const payload = result.data?.generateUploadURL        
        expect(payload?.uploadURL).toContain('.docx')
        expect(payload?.expiresIn).toBeDefined()
    })
    
    it('returns a valid presigned URL for a spreadsheet', async() => {
        const result = await executeGraphQLOperation(server, {
            query: GenerateUploadUrlDocument,
            variables: {
                input: {
                    fileName: 'test-sheet.xlsx',
                    fileType: 'XLSX',
                },
            },
        })
     
        expect(result.errors).toBeUndefined()
        const payload = result.data?.generateUploadURL
        expect(payload).toBeDefined()
        expect(payload?.uploadURL).toContain('.xlsx')
        expect(payload?.expiresIn).toBeDefined()
    })

    it('throws an error when file name is missing', async () => {
        const result = await executeGraphQLOperation(server, {
            query: GenerateUploadUrlDocument,
            variables: {
                input: {
                    fileName: '',
                    fileType: 'PDF',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toMatch('file name cannot be blank')
    })

    it('throws an error when fileType does not match file extension', async () => {
        const result = await executeGraphQLOperation(server, {
            query: GenerateUploadUrlDocument,
            variables: {
                input: {
                    fileName: 'test.doc',
                    fileType: 'PDF',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toMatch('File extension ".doc" does not match fileType "PDF"')
    })
})