import { generateDocumentZip, extractS3Key } from './generateZip'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { vi } from 'vitest'

vi.mock('../logger', () => ({
    logError: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => {
    const mockSendFn = vi.fn()
    return {
        S3Client: vi.fn(() => ({ send: mockSendFn })),
        GetObjectCommand: vi.fn((params) => ({
            commandType: 'GetObject',
            ...params,
        })),
        PutObjectCommand: vi.fn((params) => ({
            commandType: 'PutObject',
            ...params,
        })),
    }
})

// Mock other modules
vi.mock('fs')
const mockFs = vi.mocked(fs)

vi.mock('stream/promises', () => ({
    pipeline: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('archiver')
import Archiver from 'archiver'
const mockArchiver = vi.mocked(Archiver)

vi.mock('crypto')
const mockCrypto = vi.mocked(crypto)

describe('generateDocumentZip', () => {
    const mockTempDir = '/tmp/test-zip-123'
    let mockSend: ReturnType<typeof vi.fn>

    beforeEach(async () => {
        vi.clearAllMocks()

        // Get reference to the mock send function
        const { S3Client } = await import('@aws-sdk/client-s3')
        const mockS3Instance = new (S3Client as vi.MockedClass<
            typeof S3Client
        >)()
        mockSend = mockS3Instance.send

        // Default S3 mock responses - provide successful responses by default
        mockSend.mockImplementation((command) => {
            // Check command type by the commandType we added in mock
            if (command.commandType === 'GetObject') {
                return Promise.resolve({
                    Body: new Readable({
                        read() {
                            this.push('mock file content')
                            this.push(null)
                        },
                    }),
                })
            }
            if (command.commandType === 'PutObject') {
                return Promise.resolve({})
            }
            return Promise.resolve({})
        })

        // Setup fs mocks
        mockFs.mkdtempSync.mockReturnValue(mockTempDir)
        mockFs.existsSync.mockReturnValue(true)
        mockFs.statSync.mockReturnValue({ size: 1024 } as fs.Stats)

        mockFs.createWriteStream.mockReturnValue({
            write: vi.fn(),
            end: vi.fn(),
            on: vi.fn(),
        } as unknown as fs.WriteStream)

        const mockReadStream = {
            on: vi.fn((event: string, callback: (data?: Buffer) => void) => {
                if (event === 'data') {
                    callback(Buffer.from('test content'))
                } else if (event === 'end') {
                    callback()
                }
                return mockReadStream
            }),
        }
        mockFs.createReadStream.mockReturnValue(
            mockReadStream as unknown as fs.ReadStream
        )
        mockFs.rmSync.mockImplementation(() => {})

        // Setup archiver mock
        const mockArchive = {
            pipe: vi.fn(),
            file: vi.fn(),
            finalize: vi.fn().mockResolvedValue(undefined),
        }
        mockArchiver.mockReturnValue(
            mockArchive as unknown as ReturnType<typeof Archiver>
        )

        // Setup crypto mock
        const mockHashInstance = {
            update: vi.fn(),
            digest: vi.fn().mockReturnValue('mockedhash123'),
            on: vi.fn((event: string, callback: (data?: Buffer) => void) => {
                if (event === 'data') {
                    mockHashInstance.update()
                } else if (event === 'end') {
                    callback()
                }
                return mockHashInstance
            }),
        }
        mockCrypto.createHash.mockReturnValue(
            mockHashInstance as unknown as crypto.Hash
        )
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
                if (command.commandType === 'GetObject') {
                    return Promise.resolve({
                        Body: new Readable({
                            read() {
                                this.push('mock file content')
                                this.push(null)
                            },
                        }),
                    })
                }
                if (command.commandType === 'PutObject') {
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
    })

    describe('error handling', () => {
        it('returns error when no documents provided', async () => {
            const result = await generateDocumentZip([], 'output.zip')

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toBe(
                'No documents provided for zip generation'
            )
        })
    })
})
