import { generateDocumentZip, extractS3Key } from './generateZip'
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { vi } from 'vitest'

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3')
const mockS3Client = S3Client as vi.MockedClass<typeof S3Client>
const mockSend = vi.fn()

// Mock file system operations
vi.mock('fs')
const mockFs = fs as {
    mkdtempSync: vi.MockedFunction<typeof fs.mkdtempSync>
    existsSync: vi.MockedFunction<typeof fs.existsSync>
    statSync: vi.MockedFunction<typeof fs.statSync>
    createWriteStream: vi.MockedFunction<typeof fs.createWriteStream>
    createReadStream: vi.MockedFunction<typeof fs.createReadStream>
    rmSync: vi.MockedFunction<typeof fs.rmSync>
}

// Mock archiver
vi.mock('archiver')
import Archiver from 'archiver'
const mockArchiver = Archiver as vi.MockedFunction<typeof Archiver>

describe('generateDocumentZip', () => {
    const mockTempDir = '/tmp/test-zip-123'

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup S3 client mock
        mockS3Client.prototype.send = mockSend

        // Setup fs mocks
        mockFs.mkdtempSync.mockReturnValue(mockTempDir)
        mockFs.existsSync.mockReturnValue(true)
        mockFs.statSync.mockReturnValue({ size: 1024 })
        mockFs.createWriteStream.mockReturnValue({
            write: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
        })
        mockFs.createReadStream.mockReturnValue({
            on: vi.fn((event: string, callback: (data?: Buffer) => void) => {
                if (event === 'data') {
                    callback(Buffer.from('test content'))
                } else if (event === 'end') {
                    callback()
                }
                return this
            }),
        })
        mockFs.rmSync.mockImplementation(() => {})

        // Setup archiver mock
        const mockArchive = {
            pipe: vi.fn(),
            file: vi.fn(),
            finalize: vi.fn().mockResolvedValue(undefined),
        }
        mockArchiver.mockReturnValue(mockArchive)
    })

    describe('extractS3Key', () => {
        it('extracts key from s3:// URL format', () => {
            const result = extractS3Key('s3://my-bucket/path/to/file.pdf')
            expect(result).toBe('path/to/file.pdf')
        })

        it('extracts key from https S3 URL format', () => {
            const result = extractS3Key(
                'https://my-bucket.s3.amazonaws.com/path/to/file.pdf'
            )
            expect(result).toBe('path/to/file.pdf')
        })

        it('handles nested path correctly', () => {
            const result = extractS3Key(
                's3://bucket/contracts/123/documents/file.pdf'
            )
            expect(result).toBe('contracts/123/documents/file.pdf')
        })

        it('returns error for invalid URL format', () => {
            const result = extractS3Key('invalid-url')
            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Unsupported S3 URL format'
            )
        })
    })

    describe('successful zip generation', () => {
        const mockDocuments = [
            {
                s3URL: 's3://test-bucket/contract-doc1.pdf',
                name: 'Contract Document 1.pdf',
                sha256: 'abc123',
            },
            {
                s3URL: 's3://test-bucket/contract-doc2.pdf',
                name: 'Contract Document 2.pdf',
                sha256: 'def456',
            },
        ]

        beforeEach(() => {
            // Mock successful S3 operations
            mockSend.mockImplementation((command) => {
                if (command instanceof GetObjectCommand) {
                    return Promise.resolve({
                        Body: new Readable({
                            read() {
                                this.push('mock file content')
                                this.push(null)
                            },
                        }),
                    })
                }
                if (command instanceof PutObjectCommand) {
                    return Promise.resolve({})
                }
                return Promise.resolve({})
            })
        })

        it('generates zip file successfully with valid documents', async () => {
            const result = await generateDocumentZip(
                mockDocuments,
                'zips/contract-123/documents.zip'
            )

            expect(result).not.toBeInstanceOf(Error)
            const successResult = result as { s3URL: string; sha256: string }
            expect(successResult.s3URL).toBe(
                's3://test-bucket/zips/contract-123/documents.zip'
            )
            expect(successResult.sha256).toBeTruthy()
            expect(typeof successResult.sha256).toBe('string')
        })

        it('creates temporary directory and cleans up', async () => {
            await generateDocumentZip(mockDocuments, 'test-output.zip')

            expect(mockFs.mkdtempSync).toHaveBeenCalledWith(
                path.join(os.tmpdir(), 'document-zip-')
            )
            expect(mockFs.rmSync).toHaveBeenCalledWith(mockTempDir, {
                recursive: true,
                force: true,
            })
        })

        it('downloads files and adds them to archive with correct names', async () => {
            await generateDocumentZip(mockDocuments, 'test-output.zip')

            // Verify S3 downloads were called
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: 'test-bucket',
                        Key: 'contract-doc1.pdf',
                    }),
                }),
                expect.any(Object)
            )

            // Verify files were added to archive
            const mockArchive = mockArchiver.mock.results[0].value
            expect(mockArchive.file).toHaveBeenCalledWith(expect.any(String), {
                name: 'Contract Document 1.pdf',
            })
            expect(mockArchive.file).toHaveBeenCalledWith(expect.any(String), {
                name: 'Contract Document 2.pdf',
            })
        })

        it('uploads zip file to S3 with correct parameters', async () => {
            await generateDocumentZip(mockDocuments, 'test-output.zip')

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        Bucket: 'test-bucket',
                        Key: 'test-output.zip',
                        ContentType: 'application/zip',
                    }),
                })
            )
        })
    })

    describe('error handling', () => {
        it('returns error when no documents provided', async () => {
            const result = await generateDocumentZip([], 'output.zip')

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toBe(
                'No documents provided for zip generation'
            )
        })

        it('returns error when temporary directory creation fails', async () => {
            mockFs.mkdtempSync.mockImplementation(() => {
                throw new Error('Failed to create temp dir')
            })

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to create temporary directory'
            )
        })

        it('returns error when S3 download fails', async () => {
            mockSend.mockRejectedValue(new Error('S3 download failed'))

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'S3 error downloading file'
            )
        })

        it('returns error when download times out', async () => {
            const abortError = new Error('Request aborted')
            abortError.name = 'AbortError'
            mockSend.mockRejectedValue(abortError)

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip',
                {
                    baseTimeout: 1000,
                    timeoutPerMB: 100,
                    batchSize: 1,
                    maxTotalSize: 1024 * 1024,
                }
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain('Download timeout')
        })

        it('returns error when total size exceeds limit', async () => {
            // Mock large file sizes
            mockFs.statSync.mockReturnValue({ size: 600 * 1024 * 1024 }) // 600MB each
            mockSend.mockResolvedValue({
                Body: new Readable({
                    read() {
                        this.push('large file content')
                        this.push(null)
                    },
                }),
            })

            const largeDocuments = [
                { s3URL: 's3://bucket/large1.pdf', name: 'large1.pdf' },
                { s3URL: 's3://bucket/large2.pdf', name: 'large2.pdf' },
            ]

            const result = await generateDocumentZip(
                largeDocuments,
                'output.zip',
                {
                    maxTotalSize: 1024 * 1024 * 1024,
                    batchSize: 50,
                    baseTimeout: 120000,
                    timeoutPerMB: 1000,
                } // 1GB limit
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'exceeds maximum allowed size'
            )
        })

        it('returns error when archive creation fails', async () => {
            const mockArchive = {
                pipe: vi.fn(),
                file: vi.fn(),
                finalize: vi
                    .fn()
                    .mockRejectedValue(new Error('Archive failed')),
            }
            mockArchiver.mockReturnValue(mockArchive)

            mockSend.mockResolvedValue({
                Body: new Readable({
                    read() {
                        this.push('content')
                        this.push(null)
                    },
                }),
            })

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to create zip archive'
            )
        })

        it('returns error when S3 upload fails', async () => {
            mockSend.mockImplementation((command) => {
                if (command instanceof GetObjectCommand) {
                    return Promise.resolve({
                        Body: new Readable({
                            read() {
                                this.push('content')
                                this.push(null)
                            },
                        }),
                    })
                }
                if (command instanceof PutObjectCommand) {
                    return Promise.reject(new Error('Upload failed'))
                }
                return Promise.resolve({})
            })

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to upload zip to S3'
            )
        })

        it('handles invalid S3 URL formats', async () => {
            const result = await generateDocumentZip(
                [{ s3URL: 'invalid-url', name: 'file.pdf' }],
                'output.zip'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Unsupported S3 URL format'
            )
        })
    })

    describe('batch processing', () => {
        it('processes documents in batches', async () => {
            const manyDocuments = Array.from({ length: 120 }, (_, i) => ({
                s3URL: `s3://bucket/doc${i}.pdf`,
                name: `Document ${i}.pdf`,
            }))

            mockSend.mockResolvedValue({
                Body: new Readable({
                    read() {
                        this.push('content')
                        this.push(null)
                    },
                }),
            })

            const result = await generateDocumentZip(
                manyDocuments,
                'output.zip',
                {
                    batchSize: 50,
                    maxTotalSize: 1024 * 1024 * 1024,
                    baseTimeout: 120000,
                    timeoutPerMB: 1000,
                }
            )

            expect(result).not.toBeInstanceOf(Error)
            // With 120 documents and batch size 50, should have 3 batches
            expect(mockSend).toHaveBeenCalledTimes(121) // 120 downloads + 1 upload
        })
    })

    describe('cleanup behavior', () => {
        it('cleans up temporary files even when zip generation fails', async () => {
            mockSend.mockRejectedValue(new Error('Download failed'))

            await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            expect(mockFs.rmSync).toHaveBeenCalledWith(mockTempDir, {
                recursive: true,
                force: true,
            })
        })

        it('continues cleanup even if cleanup fails', async () => {
            mockFs.rmSync.mockImplementation(() => {
                throw new Error('Cleanup failed')
            })

            const result = await generateDocumentZip(
                [{ s3URL: 's3://bucket/file.pdf', name: 'file.pdf' }],
                'output.zip'
            )

            // Should not throw even if cleanup fails
            expect(result).toBeDefined()
        })
    })
})
