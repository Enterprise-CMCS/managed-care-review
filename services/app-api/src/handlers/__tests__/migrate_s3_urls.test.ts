import { CopyObjectCommand, GetObjectTaggingCommand } from '@aws-sdk/client-s3'
import type { Callback, Context } from 'aws-lambda'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
    main,
    migrateDocumentTable,
    migrateZipTable,
    type MigrationPrismaClient,
} from '../migrate_s3_urls'

const testContext = {} as Context
const testCallback: Callback = vi.fn()

function createMigrationClient(
    documents: Array<{
        id: string
        s3URL: string
        name: string
        s3BucketName: string | null
        s3Key: string | null
    }> = [],
    zips: Array<{
        id: string
        s3URL: string
        s3BucketName: string | null
        s3Key: string | null
    }> = []
): {
    client: MigrationPrismaClient
    documentTable: MigrationPrismaClient['contractDocument']
    zipTable: MigrationPrismaClient['documentZipPackage']
} {
    const emptyDocumentTable: MigrationPrismaClient['contractDocument'] = {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
    }
    const documentTable: MigrationPrismaClient['contractDocument'] = {
        findMany: vi.fn().mockResolvedValue(documents),
        update: vi.fn().mockResolvedValue({}),
    }
    const zipTable: MigrationPrismaClient['documentZipPackage'] = {
        findMany: vi.fn().mockResolvedValue(zips),
        update: vi.fn().mockResolvedValue({}),
    }

    return {
        // These helper tests exercise one representative document table and
        // the zip table. The remaining required document delegates return no
        // candidates so they satisfy the migration client without affecting
        // the table under test.
        client: {
            contractDocument: documentTable,
            contractSupportingDocument: emptyDocumentTable,
            rateDocument: emptyDocumentTable,
            rateSupportingDocument: emptyDocumentTable,
            contractQuestionDocument: emptyDocumentTable,
            contractQuestionResponseDocument: emptyDocumentTable,
            rateQuestionDocument: emptyDocumentTable,
            rateQuestionResponseDocument: emptyDocumentTable,
            documentZipPackage: zipTable,
        },
        documentTable,
        zipTable,
    }
}

describe('migrate_s3_urls handler', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    describe('environment variable validation', () => {
        test('throws error when VITE_APP_S3_DOCUMENTS_BUCKET is missing', async () => {
            vi.stubEnv('VITE_APP_S3_DOCUMENTS_BUCKET', '')
            vi.stubEnv('VITE_APP_S3_QA_BUCKET', 'test-qa-bucket')

            await expect(main({}, testContext, testCallback)).rejects.toThrow(
                'VITE_APP_S3_DOCUMENTS_BUCKET environment variable is required'
            )
        })

        test('throws error when VITE_APP_S3_QA_BUCKET is missing', async () => {
            vi.stubEnv('VITE_APP_S3_DOCUMENTS_BUCKET', 'test-docs-bucket')
            vi.stubEnv('VITE_APP_S3_QA_BUCKET', '')

            await expect(main({}, testContext, testCallback)).rejects.toThrow(
                'VITE_APP_S3_QA_BUCKET environment variable is required'
            )
        })
    })
})

describe('document object reconciliation', () => {
    const legacyDocument = {
        id: 'document-1',
        s3URL: 's3://legacy-bucket/uuid.pdf/original.pdf',
        name: 'original.pdf',
        s3BucketName: 'legacy-bucket',
        s3Key: 'allusers/uuid.pdf',
    }

    test('reuses an existing CDK object instead of copying it again', async () => {
        const { client, documentTable } = createMigrationClient([
            legacyDocument,
        ])
        const send = vi.fn().mockResolvedValue({})

        const result = await migrateDocumentTable(
            client,
            'contractDocument',
            'cdk-bucket',
            undefined,
            false,
            { send }
        )

        expect(result).toEqual({ processed: 1, failed: 0 })
        expect(documentTable.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: expect.arrayContaining([
                        { s3BucketName: { not: 'cdk-bucket' } },
                        {
                            s3URL: {
                                not: {
                                    startsWith: 's3://cdk-bucket/',
                                },
                            },
                        },
                    ]),
                },
            })
        )
        expect(send).toHaveBeenCalledTimes(1)
        expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectTaggingCommand)
        expect(send.mock.calls[0][0].input).toEqual({
            Bucket: 'cdk-bucket',
            Key: 'allusers/uuid.pdf',
        })
        expect(documentTable.update).toHaveBeenCalledWith({
            where: { id: 'document-1' },
            data: {
                s3URL: 's3://cdk-bucket/uuid.pdf/original.pdf',
                s3BucketName: 'cdk-bucket',
                s3Key: 'allusers/uuid.pdf',
            },
        })
    })

    test('does not treat access denied as a missing object', async () => {
        const { client, documentTable } = createMigrationClient([
            legacyDocument,
        ])
        const send = vi.fn().mockRejectedValue({
            name: 'AccessDenied',
            $metadata: { httpStatusCode: 403 },
        })
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const result = await migrateDocumentTable(
            client,
            'contractDocument',
            'cdk-bucket',
            undefined,
            false,
            { send }
        )

        expect(result).toEqual({ processed: 0, failed: 1 })
        expect(send).toHaveBeenCalledOnce()
        expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectTaggingCommand)
        expect(documentTable.update).not.toHaveBeenCalled()
    })

    test('copies an old-bucket-only object before changing its database pointer', async () => {
        const migratedMetadataWithStaleURL = {
            ...legacyDocument,
            s3BucketName: 'cdk-bucket',
        }
        const { client, documentTable } = createMigrationClient([
            migratedMetadataWithStaleURL,
        ])
        const send = vi
            .fn()
            .mockRejectedValueOnce({
                name: 'NotFound',
                $metadata: { httpStatusCode: 404 },
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        const result = await migrateDocumentTable(
            client,
            'contractDocument',
            'cdk-bucket',
            undefined,
            false,
            { send }
        )

        expect(result).toEqual({ processed: 1, failed: 0 })
        expect(send.mock.calls[1][0]).toBeInstanceOf(CopyObjectCommand)
        expect(send.mock.calls[1][0].input).toEqual({
            Bucket: 'cdk-bucket',
            Key: 'allusers/uuid.pdf',
            CopySource: 'legacy-bucket/allusers/uuid.pdf',
        })
        expect(send.mock.calls[2][0]).toBeInstanceOf(GetObjectTaggingCommand)
        expect(documentTable.update).toHaveBeenCalledOnce()
    })

    test('does not change the database pointer when copying the object fails', async () => {
        const { client, documentTable } = createMigrationClient([
            legacyDocument,
        ])
        const copyError = new Error('legacy object unavailable')
        const send = vi
            .fn()
            .mockRejectedValueOnce({
                name: 'NotFound',
                $metadata: { httpStatusCode: 404 },
            })
            .mockRejectedValueOnce(copyError)
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const result = await migrateDocumentTable(
            client,
            'contractDocument',
            'cdk-bucket',
            undefined,
            false,
            { send }
        )

        expect(result).toEqual({ processed: 0, failed: 1 })
        expect(documentTable.update).not.toHaveBeenCalled()
    })

    test('dry run reports the repair without touching S3 or the database', async () => {
        const { client, documentTable } = createMigrationClient([
            legacyDocument,
        ])
        const send = vi.fn()

        const result = await migrateDocumentTable(
            client,
            'contractDocument',
            'cdk-bucket',
            undefined,
            true,
            { send }
        )

        expect(result).toEqual({ processed: 1, failed: 0 })
        expect(send).not.toHaveBeenCalled()
        expect(documentTable.update).not.toHaveBeenCalled()
    })

    test('canonicalizes existing zip package records', async () => {
        const { client, zipTable } = createMigrationClient(
            [],
            [
                {
                    id: 'zip-1',
                    s3URL: 's3://legacy-bucket/zips/contracts/revision/documents.zip',
                    s3BucketName: 'legacy-bucket',
                    s3Key: 'zips/contracts/revision/documents.zip',
                },
            ]
        )
        const send = vi.fn().mockResolvedValue({})

        const result = await migrateZipTable(
            client,
            'cdk-bucket',
            undefined,
            false,
            { send }
        )

        expect(result).toEqual({ processed: 1, failed: 0 })
        expect(zipTable.update).toHaveBeenCalledWith({
            where: { id: 'zip-1' },
            data: {
                s3URL: 's3://cdk-bucket/zips/contracts/revision/documents.zip',
                s3BucketName: 'cdk-bucket',
                s3Key: 'zips/contracts/revision/documents.zip',
            },
        })
    })
})
