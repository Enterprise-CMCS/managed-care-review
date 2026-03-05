import { generateDocumentZip } from './generateZip'
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
        __mockSendFn: mockSendFn,
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

        const s3Module = await import('@aws-sdk/client-s3')
        mockSend = (s3Module as any).__mockSendFn

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

    describe('successful zip generation', () => {
        const mockDocuments = [
            {
                s3URL: 's3://test-bucket/contract-doc1.pdf',
                name: 'Contract Document 1.pdf',
                sha256: 'abc123',
                s3BucketName: 'test-bucket',
                s3Key: 'allusers/contract-doc1.pdf',
            },
            {
                s3URL: 's3://test-bucket/contract-doc2.pdf',
                name: 'Contract Document 2.pdf',
                sha256: 'def456',
                s3BucketName: 'test-bucket',
                s3Key: 'allusers/contract-doc2.pdf',
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
            const successResult = result as {
                s3URL: string
                sha256: string
                s3BucketName: string
                s3Key: string
            }
            expect(successResult.s3URL).toBe(
                's3://test-bucket/zips/contract-123/documents.zip'
            )
            expect(successResult.sha256).toBeTruthy()
            expect(typeof successResult.sha256).toBe('string')
            expect(successResult.s3BucketName).toBe('test-bucket')
            expect(successResult.s3Key).toBe('zips/contract-123/documents.zip')
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

    describe('s3Key formats', () => {
        beforeEach(() => {
            // Setup S3 mocks
            mockSend.mockImplementation((command) => {
                if (command.commandType === 'GetObject') {
                    return Promise.resolve({
                        Body: new Readable({
                            read() {
                                this.push('mock content')
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
                on: vi.fn(
                    (event: string, callback: (data?: Buffer) => void) => {
                        if (event === 'data') {
                            callback(Buffer.from('test content'))
                        } else if (event === 'end') {
                            callback()
                        }
                        return mockReadStream
                    }
                ),
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
                on: vi.fn(
                    (event: string, callback: (data?: Buffer) => void) => {
                        if (event === 'data') {
                            mockHashInstance.update()
                        } else if (event === 'end') {
                            callback()
                        }
                        return mockHashInstance
                    }
                ),
            }
            mockCrypto.createHash.mockReturnValue(
                mockHashInstance as unknown as crypto.Hash
            )
        })

        it('handles document keys with allusers/ prefix', async () => {
            const docsWithPrefix = [
                {
                    s3URL: 's3://test-bucket/allusers/uuid2.pdf',
                    name: 'doc2.pdf',
                    s3BucketName: 'test-bucket',
                    s3Key: 'allusers/uuid2.pdf',
                },
            ]

            const result = await generateDocumentZip(docsWithPrefix, 'test.zip')

            expect(result).not.toBeInstanceOf(Error)
            // Verify GetObjectCommand was called with full key
            const getObjectCalls = mockSend.mock.calls.filter(
                (call) => call[0].commandType === 'GetObject'
            )
            expect(getObjectCalls.length).toBeGreaterThan(0)
            expect(getObjectCalls[0][0].Key).toBe('allusers/uuid2.pdf')
        })

        it('handles zip document keys', async () => {
            const zipDocs = [
                {
                    s3URL: 's3://test-bucket/zips/contracts/uuid/doc.zip',
                    name: 'doc.zip',
                    s3BucketName: 'test-bucket',
                    s3Key: 'zips/contracts/uuid/doc.zip',
                },
            ]

            const result = await generateDocumentZip(zipDocs, 'test.zip')

            expect(result).not.toBeInstanceOf(Error)
            const getObjectCalls = mockSend.mock.calls.filter(
                (call) => call[0].commandType === 'GetObject'
            )
            expect(getObjectCalls.length).toBeGreaterThan(0)
            expect(getObjectCalls[0][0].Key).toBe('zips/contracts/uuid/doc.zip')
        })
    })
})
