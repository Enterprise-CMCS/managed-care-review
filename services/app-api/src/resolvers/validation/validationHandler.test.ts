import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DateValidationFieldInput } from '../../../../ai-form-augmentation/src/prompts'

const {
    getBufferMock,
    getJsonMock,
    putJsonMock,
    parsePdfMock,
    extractPdfTextSampleMock,
    chunkDocumentMock,
    embedTextsMock,
    embedTextMock,
    generateValidationMock,
    parseValidationResponseMock,
    buildDateValidationPromptMock,
    runDeterministicDateValidationMock,
    consoleWarnMock,
} = vi.hoisted(() => ({
    getBufferMock: vi.fn(),
    getJsonMock: vi.fn(),
    putJsonMock: vi.fn(),
    parsePdfMock: vi.fn(),
    extractPdfTextSampleMock: vi.fn(),
    chunkDocumentMock: vi.fn(),
    embedTextsMock: vi.fn(),
    embedTextMock: vi.fn(),
    generateValidationMock: vi.fn(),
    parseValidationResponseMock: vi.fn(),
    buildDateValidationPromptMock: vi.fn(() => 'test-prompt'),
    consoleWarnMock: vi.fn(),
    runDeterministicDateValidationMock: vi.fn(
        (input: { formFields: DateValidationFieldInput[] }) => ({
            resolvedResults: input.formFields.map(
                (field: DateValidationFieldInput) => ({
                    field: field.field,
                    outcome: 'match',
                    confidence: 'high',
                    message: `Document text includes ${
                        field.field === 'contractStartDate'
                            ? 'start date'
                            : 'end date'
                    } ${field.value}.`,
                    decisionSource: 'deterministic',
                    citations: [
                        {
                            chunkId: 'contract-a.pdf::chunk-0',
                            documentName: 'contract-a.pdf',
                            page: null,
                            order: 0,
                        },
                    ],
                })
            ),
            unresolvedFields: [] as DateValidationFieldInput[],
        })
    ),
}))

vi.mock('../../../../ai-form-augmentation/src/s3', () => ({
    newArtifactS3Client: vi.fn(() => ({
        getBuffer: getBufferMock,
        getJson: getJsonMock,
        putJson: putJsonMock,
    })),
}))

vi.mock('../../../../ai-form-augmentation/src/parsing', () => ({
    parsePdf: parsePdfMock,
    extractPdfTextSample: extractPdfTextSampleMock,
}))

vi.mock('../../../../ai-form-augmentation/src/chunking', () => ({
    chunkDocument: chunkDocumentMock,
}))

vi.mock('../../../../ai-form-augmentation/src/embeddings', () => ({
    XenovaEmbeddingProvider: vi.fn().mockImplementation(() => ({
        embedTexts: embedTextsMock,
        embedText: embedTextMock,
        getModelInfo: vi.fn(() => 'test-embedding-model'),
    })),
}))

vi.mock('../../../../ai-form-augmentation/src/llm', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>

    return {
        ...actual,
        OllamaValidationClient: vi.fn().mockImplementation(() => ({
            generateValidation: generateValidationMock,
        })),
        newValidationLlmClient: vi.fn().mockImplementation(() => ({
            generateValidation: generateValidationMock,
        })),
    }
})

vi.mock('../../../../ai-form-augmentation/src/prompts', () => ({
    buildDateValidationPrompt: buildDateValidationPromptMock,
}))

vi.mock(
    '../../../../ai-form-augmentation/src/retrieval',
    async (importOriginal) => {
        const actual = (await importOriginal()) as Record<string, unknown>

        return {
            ...actual,
            orderRetrievedChunks: vi.fn(
                (
                    results: Array<{
                        id: string
                        score: number
                        metadata: unknown
                    }>
                ) => results
            ),
        }
    }
)

vi.mock(
    '../../../../ai-form-augmentation/src/validation-output',
    async (importOriginal) => {
        const actual = (await importOriginal()) as Record<string, unknown>

        return {
            ...actual,
            runDeterministicDateValidation: runDeterministicDateValidationMock,
            parseValidationResponse: parseValidationResponseMock,
        }
    }
)

import {
    computeDocumentCacheKey,
    getChunksArtifactKey,
    getParsedDocumentArtifactKeyForDocument,
} from '../../../../ai-form-augmentation/src/artifacts'
import { getValidationResultKey } from '../../../../ai-form-augmentation/src/results'
import { getValidationStatusKey } from '../../../../ai-form-augmentation/src/status'
import { validationHandler } from '../../../../ai-form-augmentation/src/handlers'

const baseEvent = {
    formId: 'test-form',
    artifactVersion: 'artifact-v1',
    bucket: 'ai-form-augmentation-artifacts',
    s3Config: {
        region: 'us-east-1',
    },
    formFields: [
        {
            field: 'contractStartDate' as const,
            label: 'Contract Start Date',
            value: 'January 1, 2025',
        },
        {
            field: 'contractEndDate' as const,
            label: 'Contract End Date',
            value: 'December 31, 2025',
        },
    ],
    documents: [
        {
            documentName: 'contract-a.pdf',
            sourceBucket: 'local-uploads',
            sourceKey: 'uploads/contracts/contract-a.pdf',
        },
    ],
}

describe('validationHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getBufferMock.mockReset()
        getJsonMock.mockReset()
        putJsonMock.mockReset()
        parsePdfMock.mockReset()
        extractPdfTextSampleMock.mockReset()
        chunkDocumentMock.mockReset()
        embedTextsMock.mockReset()
        embedTextMock.mockReset()
        generateValidationMock.mockReset()
        parseValidationResponseMock.mockReset()
        buildDateValidationPromptMock.mockReset()
        consoleWarnMock.mockReset()
        runDeterministicDateValidationMock.mockReset()
        vi.spyOn(console, 'warn').mockImplementation(consoleWarnMock)

        buildDateValidationPromptMock.mockReturnValue('test-prompt')
        runDeterministicDateValidationMock.mockImplementation(
            (input: { formFields: DateValidationFieldInput[] }) => ({
                resolvedResults: input.formFields.map(
                    (field: DateValidationFieldInput) => ({
                        field: field.field,
                        outcome: 'match',
                        confidence: 'high',
                        message: `Document text includes ${
                            field.field === 'contractStartDate'
                                ? 'start date'
                                : 'end date'
                        } ${field.value}.`,
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    })
                ),
                unresolvedFields: [] as DateValidationFieldInput[],
            })
        )

        getBufferMock.mockResolvedValue(Buffer.from('fake-pdf'))
        getJsonMock.mockRejectedValue(new Error('S3 object not found'))
        parsePdfMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => ({
                fileName,
                rawText:
                    'START DATE January 1, 2025 END DATE December 31, 2025',
                pageTexts: [
                    'START DATE January 1, 2025 END DATE December 31, 2025',
                ],
                pageCount: 1,
                extractionMethod: 'pdf-text',
                extractionNotes: [],
                ocrDisposition: 'not-needed',
            })
        )
        extractPdfTextSampleMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => ({
                fileName,
                rawText: 'generic contract summary boilerplate',
                pageTexts: ['generic contract summary boilerplate'],
                pageCount: 1,
                extractionMethod: 'pdf-text',
                extractionNotes: [],
                ocrDisposition: 'not-needed',
            })
        )
        chunkDocumentMock.mockImplementation((fileName: string) => [
            {
                chunkId: `${fileName}::chunk-0`,
                documentName: fileName,
                order: 0,
                page: null,
                text: 'START DATE January 1, 2025 END DATE December 31, 2025',
                startChar: 0,
                endChar: 56,
            },
        ])
        embedTextsMock.mockResolvedValue([[0.1, 0.2, 0.3]])
        embedTextMock.mockResolvedValue([0.1, 0.2, 0.3])
        generateValidationMock.mockResolvedValue({
            rawText:
                '[{"field":"contractStartDate","outcome":"match","confidence":"high","message":"Start date matches.","citations":[{"chunkId":"contract-a.pdf::chunk-0","documentName":"wrong.pdf","page":9,"order":9}]}]',
            model: 'llama3.1:8b',
        })
        parseValidationResponseMock.mockReturnValue({
            normalizedRawText: '[]',
            results: [
                {
                    field: 'contractStartDate',
                    outcome: 'match',
                    confidence: 'high',
                    message: 'Start date matches.',
                    decisionSource: 'llm',
                    citations: [
                        {
                            chunkId: 'contract-a.pdf::chunk-0',
                            documentName: 'wrong.pdf',
                            page: 9,
                            order: 9,
                        },
                    ],
                },
            ],
        })
    })

    it('executes the runtime pipeline and persists reconciled results', async () => {
        const result = await validationHandler(baseEvent)

        expect(result).toEqual({
            formId: 'test-form',
            artifactVersion: 'artifact-v1',
            status: 'completed',
        })

        expect(getBufferMock).toHaveBeenCalledWith(
            'local-uploads',
            'uploads/contracts/contract-a.pdf'
        )

        expect(embedTextMock).toHaveBeenNthCalledWith(
            1,
            'START DATE CONTRACT START DATE the contract will become effective term begins on term of this contract term of this agreement amended to read deemed to read superseding replacement'
        )
        expect(embedTextMock).toHaveBeenNthCalledWith(
            2,
            'contract end date through end date current contract expiration date requested contract expiration date original contract expiration date continue in full force and effect through term ends expiration date term of this contract term of this agreement amended to read deemed to read superseding replacement notwithstanding'
        )
        expect(consoleWarnMock).toHaveBeenCalledWith(
            'Validation citations missing page metadata',
            {
                formId: 'test-form',
                count: 2,
                chunkIds: ['contract-a.pdf::chunk-0'],
            }
        )

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getChunksArtifactKey('test-form'),
            expect.objectContaining({
                artifactVersion: 'artifact-v1',
                chunks: expect.arrayContaining([
                    expect.objectContaining({
                        chunkId: 'contract-a.pdf::chunk-0',
                    }),
                ]),
            })
        )

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                artifactVersion: 'artifact-v1',
                formSnapshotHash: expect.any(String),
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes start date January 1, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
            })
        )

        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                artifactVersion: 'artifact-v1',
                error: null,
            })
        )
    })

    it('writes failed status when the pipeline throws', async () => {
        parsePdfMock.mockRejectedValueOnce(new Error('parse failure'))

        await expect(validationHandler(baseEvent)).rejects.toThrow(
            'Validation could not index any usable documents for form test-form'
        )

        expect(putJsonMock).toHaveBeenNthCalledWith(
            1,
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'parsing',
                artifactVersion: 'artifact-v1',
            })
        )

        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'failed',
                artifactVersion: 'artifact-v1',
                error: 'Validation could not index any usable documents for form test-form',
                documentDiagnostics: [
                    expect.objectContaining({
                        documentName: 'contract-a.pdf',
                        status: 'failed',
                        error: 'parse failure',
                    }),
                ],
            })
        )
    })

    it('persists bounded parsing progress during multi-document indexing', async () => {
        const multiDocumentEvent = {
            ...baseEvent,
            documents: Array.from({ length: 6 }, (_value, index) => ({
                documentName: `contract-${index}.pdf`,
                sourceBucket: 'local-uploads',
                sourceKey: `uploads/contracts/contract-${index}.pdf`,
            })),
        }

        await validationHandler(multiDocumentEvent)

        const parsingProgressWrites = putJsonMock.mock.calls
            .filter(
                (call) =>
                    call[1] === getValidationStatusKey('test-form') &&
                    call[2]?.stage === 'parsing' &&
                    call[2]?.indexingProgress != null
            )
            .map((call) => call[2].indexingProgress.completedDocuments)

        expect(parsingProgressWrites).toEqual([1, 2, 3, 5, 6])
        expect(
            putJsonMock.mock.calls.some(
                (call) =>
                    call[1] === getValidationStatusKey('test-form') &&
                    call[2]?.stage === 'parsing' &&
                    call[2]?.indexingProgress?.completedDocuments === 4
            )
        ).toBe(false)
    })

    it('rebuilds chunks and embeddings from cached parsed text without reparsing unchanged documents', async () => {
        const cacheKey = computeDocumentCacheKey({
            documentName: 'contract-a.pdf',
            sourceBucket: 'local-uploads',
            sourceKey: 'uploads/contracts/contract-a.pdf',
        })

        getJsonMock.mockImplementation(async (_bucket: string, key: string) => {
            if (key === getChunksArtifactKey('test-form')) {
                return {
                    artifactVersion: 'artifact-v0',
                    generatedAt: '2026-04-23T00:00:00.000Z',
                    documents: [
                        {
                            documentName: 'contract-a.pdf',
                            sourceBucket: 'local-uploads',
                            sourceKey: 'uploads/contracts/contract-a.pdf',
                            cacheKey,
                            chunkCount: 1,
                        },
                    ],
                    chunks: [],
                }
            }

            if (
                key ===
                getParsedDocumentArtifactKeyForDocument('test-form', {
                    documentName: 'contract-a.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey: 'uploads/contracts/contract-a.pdf',
                })
            ) {
                return {
                    generatedAt: '2026-04-23T00:00:00.000Z',
                    document: {
                        documentName: 'contract-a.pdf',
                        sourceBucket: 'local-uploads',
                        sourceKey: 'uploads/contracts/contract-a.pdf',
                        cacheKey,
                        chunkCount: 0,
                    },
                    pageCount: 1,
                    rawText:
                        'START DATE January 1, 2025 END DATE December 31, 2025',
                    pageTexts: [
                        'START DATE January 1, 2025 END DATE December 31, 2025',
                    ],
                    extractionMethod: 'pdf-text',
                    extractionNotes: ['cached parse'],
                    ocrDisposition: 'not-needed',
                }
            }

            throw new Error('S3 object not found')
        })

        await validationHandler(baseEvent)

        expect(parsePdfMock).not.toHaveBeenCalled()
        expect(chunkDocumentMock).toHaveBeenCalledWith(
            'contract-a.pdf',
            'START DATE January 1, 2025 END DATE December 31, 2025',
            {
                pageTexts: [
                    'START DATE January 1, 2025 END DATE December 31, 2025',
                ],
            }
        )
        expect(embedTextsMock).toHaveBeenCalledTimes(1)
    })

    it('does not persist parsed-text artifacts for OCR-capped skipped parses', async () => {
        parsePdfMock.mockResolvedValueOnce({
            fileName: 'contract-a.pdf',
            rawText: 'too little text',
            pageTexts: ['too little text'],
            pageCount: 1,
            extractionMethod: 'pdf-text',
            extractionNotes: ['weak text'],
            ocrDisposition: 'skipped',
        })

        await expect(validationHandler(baseEvent)).rejects.toThrow(
            'Validation could not index any usable documents for form test-form'
        )

        expect(
            putJsonMock.mock.calls.some(
                (call) =>
                    call[1] ===
                    getParsedDocumentArtifactKeyForDocument('test-form', {
                        documentName: 'contract-a.pdf',
                        sourceBucket: 'local-uploads',
                        sourceKey: 'uploads/contracts/contract-a.pdf',
                    })
            )
        ).toBe(false)
    })

    it('reranks gated first-pass candidates by default', async () => {
        const rerankingEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: [
                ...Array.from({ length: 12 }, (_value, index) => ({
                    documentName: `contract-${index}.pdf`,
                    sourceBucket: 'local-uploads',
                    sourceKey: `uploads/contracts/contract-${index}.pdf`,
                })),
                {
                    documentName: 'contract-text-final.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey: 'uploads/contracts/contract-text-final.pdf',
                },
            ],
        }

        await validationHandler(rerankingEvent)

        expect(extractPdfTextSampleMock).toHaveBeenCalled()
        expect(generateValidationMock).toHaveBeenCalledTimes(13)
        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'contract-text-final.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                ]),
            })
        )
    })

    it('can defer a large low-yield document from the first pass even when its filename is generic', async () => {
        extractPdfTextSampleMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => ({
                fileName,
                rawText:
                    fileName === 'genericlowyieldexcessivelylargefile.pdf'
                        ? 'generic scope of work boilerplate'
                        : 'amendment effective date term language',
                pageTexts: [
                    fileName === 'genericlowyieldexcessivelylargefile.pdf'
                        ? 'generic scope of work boilerplate'
                        : 'amendment effective date term language',
                ],
                pageCount:
                    fileName === 'genericlowyieldexcessivelylargefile.pdf'
                        ? 630
                        : 1,
                extractionMethod: 'pdf-text',
                extractionNotes: [],
                ocrDisposition: 'not-needed',
            })
        )
        generateValidationMock.mockImplementation(async ({ prompt }) => ({
            rawText: prompt.includes(
                'Document name: genericlowyieldexcessivelylargefile.pdf'
            )
                ? 'MEDIUM'
                : 'HIGH',
            model: 'llama3.1:8b',
        }))

        const rerankingEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: [
                ...Array.from({ length: 12 }, (_value, index) => ({
                    documentName: `contract-${index}.pdf`,
                    sourceBucket: 'local-uploads',
                    sourceKey: `uploads/contracts/contract-${index}.pdf`,
                })),
                {
                    documentName: 'genericlowyieldexcessivelylargefile.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey:
                        'uploads/contracts/genericlowyieldexcessivelylargefile.pdf',
                },
            ],
        }

        await validationHandler(rerankingEvent)

        expect(extractPdfTextSampleMock).toHaveBeenCalledWith(
            expect.any(Buffer),
            'genericlowyieldexcessivelylargefile.pdf',
            2
        )
        expect(generateValidationMock).toHaveBeenCalledTimes(13)
        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'genericlowyieldexcessivelylargefile.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                ]),
            })
        )
    })

    it('can promote a poorly named amendment sample into the first pass when it clearly shows the target dates', async () => {
        extractPdfTextSampleMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => ({
                fileName,
                rawText:
                    fileName === 'zzz-amendment-cover.pdf'
                        ? 'STANDARD AGREEMENT - AMENDMENT START DATE January 1, 2025 THROUGH END DATE December 31, 2025'
                        : 'generic contract summary boilerplate',
                pageTexts: [
                    fileName === 'zzz-amendment-cover.pdf'
                        ? 'STANDARD AGREEMENT - AMENDMENT START DATE January 1, 2025 THROUGH END DATE December 31, 2025'
                        : 'generic contract summary boilerplate',
                ],
                pageCount: 2,
                extractionMethod: 'pdf-text',
                extractionNotes: [],
                ocrDisposition: 'not-needed',
            })
        )
        generateValidationMock.mockImplementation(async ({ prompt }) => ({
            rawText: prompt.includes('Document name: zzz-amendment-cover.pdf')
                ? 'HIGH'
                : 'MEDIUM',
            model: 'llama3.1:8b',
        }))

        const rerankingEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: [
                ...Array.from({ length: 12 }, (_value, index) => ({
                    documentName: `contract-${index}.pdf`,
                    sourceBucket: 'local-uploads',
                    sourceKey: `uploads/contracts/contract-${index}.pdf`,
                })),
                {
                    documentName: 'zzz-amendment-cover.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey: 'uploads/contracts/zzz-amendment-cover.pdf',
                },
            ],
        }

        await validationHandler(rerankingEvent)

        expect(generateValidationMock).toHaveBeenCalledTimes(13)
        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'zzz-amendment-cover.pdf',
                        status: 'processed',
                        workSelection: expect.objectContaining({
                            bucket: 'first-pass',
                        }),
                    }),
                    expect.objectContaining({
                        documentName: 'contract-11.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                ]),
            })
        )
    })

    it('keeps an early decisive amendment candidate in the reranking pool when later sibling amendments cluster around it', async () => {
        extractPdfTextSampleMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => ({
                fileName,
                rawText: fileName.includes('Text Final')
                    ? 'generic scope of work boilerplate'
                    : 'STANDARD AGREEMENT - AMENDMENT START DATE January 1, 2025 THROUGH END DATE December 31, 2025',
                pageTexts: [
                    fileName.includes('Text Final')
                        ? 'generic scope of work boilerplate'
                        : 'STANDARD AGREEMENT - AMENDMENT START DATE January 1, 2025 THROUGH END DATE December 31, 2025',
                ],
                pageCount: fileName.includes('Text Final') ? 630 : 2,
                extractionMethod: 'pdf-text',
                extractionNotes: [],
                ocrDisposition: 'not-needed',
            })
        )
        generateValidationMock.mockImplementation(async ({ prompt }) => ({
            rawText: prompt.includes('KP Cal 23-30230 A03 Text Final.pdf')
                ? 'LOW'
                : 'HIGH',
            model: 'llama3.1:8b',
        }))

        const rerankingEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: [
                {
                    documentName: 'AAH 23-30212 A03 213A Final.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey:
                        'uploads/contracts/AAH 23-30212 A03 213A Final.pdf',
                },
                ...Array.from({ length: 40 }, (_value, index) => ({
                    documentName: `HN 23-302${String(10 + index).padStart(
                        2,
                        '0'
                    )} A03 213A Final.pdf`,
                    sourceBucket: 'local-uploads',
                    sourceKey: `uploads/contracts/HN 23-302${String(
                        10 + index
                    ).padStart(2, '0')} A03 213A Final.pdf`,
                })),
                {
                    documentName: 'KP Cal 23-30230 A03 Text Final.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey:
                        'uploads/contracts/KP Cal 23-30230 A03 Text Final.pdf',
                },
            ],
        }

        await validationHandler(rerankingEvent)

        expect(generateValidationMock).toHaveBeenCalledTimes(36)
        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'AAH 23-30212 A03 213A Final.pdf',
                        status: 'processed',
                        workSelection: expect.objectContaining({
                            bucket: 'first-pass',
                            heuristicGroupKey: 'aah',
                            heuristicGroupKeySource: 'filename-prefix',
                        }),
                    }),
                    expect.objectContaining({
                        documentName: 'KP Cal 23-30230 A03 Text Final.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                    expect.objectContaining({
                        documentName: 'HN 23-30221 A03 213A Final.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                ]),
            })
        )
    })

    it('falls back to heuristic ranking when sampled reranking fails', async () => {
        extractPdfTextSampleMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => {
                if (fileName === 'genericlowyieldexcessivelylargefile.pdf') {
                    throw new Error('sample failure')
                }

                return {
                    fileName,
                    rawText: 'amendment effective date term language',
                    pageTexts: ['amendment effective date term language'],
                    pageCount: 1,
                    extractionMethod: 'pdf-text',
                    extractionNotes: [],
                    ocrDisposition: 'not-needed',
                }
            }
        )
        generateValidationMock.mockResolvedValue({
            rawText: 'HIGH',
            model: 'llama3.1:8b',
        })

        const rerankingEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: [
                ...Array.from({ length: 12 }, (_value, index) => ({
                    documentName: `contract-${index}.pdf`,
                    sourceBucket: 'local-uploads',
                    sourceKey: `uploads/contracts/contract-${index}.pdf`,
                })),
                {
                    documentName: 'genericlowyieldexcessivelylargefile.pdf',
                    sourceBucket: 'local-uploads',
                    sourceKey:
                        'uploads/contracts/genericlowyieldexcessivelylargefile.pdf',
                },
            ],
        }

        await validationHandler(rerankingEvent)

        expect(generateValidationMock).toHaveBeenCalledTimes(12)
        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'genericlowyieldexcessivelylargefile.pdf',
                        status: 'skipped',
                        workSelection: expect.objectContaining({
                            bucket: 'deferred',
                        }),
                    }),
                ]),
            })
        )
    })

    it('does not expand to gated-fallback when first-pass results are strong and cited despite competing labeled dates', async () => {
        chunkDocumentMock.mockImplementation((fileName: string) => [
            {
                chunkId: `${fileName}::chunk-0`,
                documentName: fileName,
                order: 0,
                page: null,
                text: [
                    'STANDARD AGREEMENT - AMENDMENT',
                    'START DATE',
                    'January 1, 2024',
                    'THROUGH END DATE',
                    'December 31, 2025',
                    'Amendment effective date: January 1, 2025.',
                    'Purpose of amendment: It extends the contract to December 31, 2025.',
                    'Paragraph 2 (term) on the face of the original STD 213 is amended to read: January 1, 2024 through December 31, 2025.',
                ].join('\n'),
                startChar: 0,
                endChar: 320,
            },
        ])

        const firstPassEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: Array.from({ length: 13 }, (_value, index) => ({
                documentName: `contract-${index}.pdf`,
                sourceBucket: 'local-uploads',
                sourceKey: `uploads/contracts/contract-${index}.pdf`,
            })),
        }

        await validationHandler(firstPassEvent)

        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                workSelectionMode: 'gated-first-pass',
                fieldWorkSelectionDiagnostics: expect.arrayContaining([
                    {
                        field: 'contractStartDate',
                        evidenceSource: 'first-pass',
                    },
                    {
                        field: 'contractEndDate',
                        evidenceSource: 'first-pass',
                    },
                ]),
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'contract-12.pdf',
                        status: 'skipped',
                        reason: 'deferred-first-pass',
                    }),
                ]),
            })
        )
        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                workSelectionMode: 'gated-first-pass',
            })
        )
    })

    it('does not expand to gated-fallback when unrelated first-pass documents are OCR-capped but both fields already have strong cited evidence', async () => {
        parsePdfMock.mockImplementation(
            async (_fileBuffer: Buffer, fileName: string) => {
                if (
                    fileName === 'contract-0.pdf' ||
                    fileName === 'contract-1.pdf'
                ) {
                    return {
                        fileName,
                        rawText: 'too little text',
                        pageTexts: ['too little text'],
                        pageCount: 1,
                        extractionMethod: 'pdf-text',
                        extractionNotes: ['weak text'],
                        ocrDisposition: 'skipped',
                    }
                }

                return {
                    fileName,
                    rawText:
                        'START DATE January 1, 2025 END DATE December 31, 2025',
                    pageTexts: [
                        'START DATE January 1, 2025 END DATE December 31, 2025',
                    ],
                    pageCount: 1,
                    extractionMethod: 'pdf-text',
                    extractionNotes: [],
                    ocrDisposition: 'not-needed',
                }
            }
        )
        runDeterministicDateValidationMock.mockImplementation(
            (input: { formFields: DateValidationFieldInput[] }) => ({
                resolvedResults: input.formFields.map(
                    (field: DateValidationFieldInput) => ({
                        field: field.field,
                        outcome: 'match',
                        confidence: 'high',
                        message: `Document text includes ${
                            field.field === 'contractStartDate'
                                ? 'start date'
                                : 'end date'
                        } ${field.value}.`,
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-2.pdf::chunk-0',
                                documentName: 'contract-2.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    })
                ),
                unresolvedFields: [] as DateValidationFieldInput[],
            })
        )

        const firstPassEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: Array.from({ length: 13 }, (_value, index) => ({
                documentName: `contract-${index}.pdf`,
                sourceBucket: 'local-uploads',
                sourceKey: `uploads/contracts/contract-${index}.pdf`,
            })),
        }

        await validationHandler(firstPassEvent)

        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                workSelectionMode: 'gated-first-pass',
                fieldWorkSelectionDiagnostics: expect.arrayContaining([
                    {
                        field: 'contractStartDate',
                        evidenceSource: 'first-pass',
                    },
                    {
                        field: 'contractEndDate',
                        evidenceSource: 'first-pass',
                    },
                ]),
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'contract-0.pdf',
                        status: 'skipped',
                        reason: 'ocr-capped-large-batch',
                    }),
                    expect.objectContaining({
                        documentName: 'contract-1.pdf',
                        status: 'skipped',
                        reason: 'ocr-capped-large-batch',
                    }),
                    expect.objectContaining({
                        documentName: 'contract-12.pdf',
                        status: 'skipped',
                        reason: 'deferred-first-pass',
                    }),
                ]),
            })
        )
        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                workSelectionMode: 'gated-first-pass',
            })
        )
    })

    it('still expands to gated-fallback when first-pass evidence is partial', async () => {
        runDeterministicDateValidationMock.mockImplementation(
            (input: { formFields: DateValidationFieldInput[] }) => ({
                resolvedResults: input.formFields.map(
                    (field: DateValidationFieldInput) =>
                        field.field === 'contractStartDate'
                            ? {
                                  field: field.field,
                                  outcome: 'not-enough-evidence',
                                  confidence: 'medium',
                                  message:
                                      'The cited evidence is ambiguous for the start date.',
                                  decisionSource: 'deterministic',
                                  citations: [],
                              }
                            : {
                                  field: field.field,
                                  outcome: 'match',
                                  confidence: 'high',
                                  message: `Document text includes end date ${field.value}.`,
                                  decisionSource: 'deterministic',
                                  citations: [
                                      {
                                          chunkId: 'contract-a.pdf::chunk-0',
                                          documentName: 'contract-a.pdf',
                                          page: null,
                                          order: 0,
                                      },
                                  ],
                              }
                ),
                unresolvedFields: [],
            })
        )

        const firstPassEvent = {
            ...baseEvent,
            workSelectionMode: 'gated-first-pass' as const,
            documents: Array.from({ length: 13 }, (_value, index) => ({
                documentName: `contract-${index}.pdf`,
                sourceBucket: 'local-uploads',
                sourceKey: `uploads/contracts/contract-${index}.pdf`,
            })),
        }

        await validationHandler(firstPassEvent)

        const validationResultCall = putJsonMock.mock.calls.find(
            ([bucket, key]) =>
                bucket === 'ai-form-augmentation-artifacts' &&
                key === getValidationResultKey('test-form')
        )

        expect(validationResultCall).toBeDefined()
        expect(validationResultCall?.[2]).toEqual(
            expect.objectContaining({
                workSelectionMode: 'gated-fallback',
                documentDiagnostics: expect.arrayContaining([
                    expect.objectContaining({
                        documentName: 'contract-12.pdf',
                        status: 'processed',
                    }),
                ]),
            })
        )
        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                workSelectionMode: 'gated-fallback',
            })
        )
        expect(
            putJsonMock.mock.calls.some(
                ([bucket, key, artifact]) =>
                    bucket === 'ai-form-augmentation-artifacts' &&
                    key === getValidationStatusKey('test-form') &&
                    artifact?.workSelectionMode === 'gated-fallback' &&
                    (artifact?.stage === 'retrieving' ||
                        artifact?.stage === 'deterministic-validation' ||
                        artifact?.stage === 'llm-validation')
            )
        ).toBe(true)
        expect(
            putJsonMock.mock.calls.some(
                ([bucket, key, artifact]) =>
                    bucket === 'ai-form-augmentation-artifacts' &&
                    key === getValidationStatusKey('test-form') &&
                    artifact?.workSelectionMode === 'gated-fallback' &&
                    artifact?.stage === 'parsing'
            )
        ).toBe(false)
    })

    it('routes unresolved fields to the llm with field-specific retrieval context', async () => {
        runDeterministicDateValidationMock
            .mockReturnValueOnce({
                resolvedResults: [],
                unresolvedFields: [
                    baseEvent.formFields[0],
                ] as DateValidationFieldInput[],
            })
            .mockReturnValueOnce({
                resolvedResults: [
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
                unresolvedFields: [],
            })

        parseValidationResponseMock.mockReturnValueOnce({
            normalizedRawText: '[]',
            results: [
                {
                    field: 'contractStartDate',
                    outcome: 'match',
                    confidence: 'medium',
                    message: 'Start date matches.',
                    decisionSource: 'llm',
                    citations: [
                        {
                            chunkId: 'contract-a.pdf::chunk-0',
                            documentName: 'wrong.pdf',
                            page: 9,
                            order: 9,
                        },
                    ],
                },
            ],
        })

        await validationHandler(baseEvent)

        expect(buildDateValidationPromptMock).toHaveBeenCalledTimes(1)
        expect(buildDateValidationPromptMock).toHaveBeenCalledWith({
            formFields: [baseEvent.formFields[0]],
            retrievedChunks: [
                expect.objectContaining({
                    chunkId: 'contract-a.pdf::chunk-0',
                }),
            ],
        })

        expect(generateValidationMock).toHaveBeenCalledTimes(1)

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'match',
                        confidence: 'medium',
                        message:
                            'Document text supports start date as 01/01/2025.',
                        decisionSource: 'llm',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
            })
        )
    })

    it('uses the matching llm result when extra results are returned', async () => {
        runDeterministicDateValidationMock
            .mockReturnValueOnce({
                resolvedResults: [],
                unresolvedFields: [
                    baseEvent.formFields[0],
                ] as DateValidationFieldInput[],
            })
            .mockReturnValueOnce({
                resolvedResults: [
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
                unresolvedFields: [],
            })

        parseValidationResponseMock.mockReturnValueOnce({
            normalizedRawText: '[]',
            results: [
                {
                    field: 'contractStartDate',
                    outcome: 'match',
                    confidence: 'medium',
                    message: 'Start date matches.',
                    decisionSource: 'llm',
                    citations: [
                        {
                            chunkId: 'contract-a.pdf::chunk-0',
                            documentName: 'wrong.pdf',
                            page: 9,
                            order: 9,
                        },
                    ],
                },
                {
                    field: 'contractEndDate',
                    outcome: 'mismatch',
                    confidence: 'low',
                    message: 'Irrelevant extra result.',
                    decisionSource: 'llm',
                    citations: [],
                },
            ],
        })

        await validationHandler(baseEvent)

        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                artifactVersion: 'artifact-v1',
                error: null,
            })
        )

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                results: [
                    expect.objectContaining({
                        field: 'contractStartDate',
                        outcome: 'match',
                        decisionSource: 'llm',
                    }),
                    expect.objectContaining({
                        field: 'contractEndDate',
                        outcome: 'match',
                        decisionSource: 'deterministic',
                    }),
                ],
            })
        )
    })

    it('uses deterministic validation for obvious labeled date matches without calling the llm', async () => {
        generateValidationMock.mockClear()
        parseValidationResponseMock.mockClear()
        buildDateValidationPromptMock.mockClear()

        await validationHandler(baseEvent)

        expect(generateValidationMock).not.toHaveBeenCalled()
        expect(parseValidationResponseMock).not.toHaveBeenCalled()
        expect(buildDateValidationPromptMock).not.toHaveBeenCalled()

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes start date January 1, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
            })
        )
    })

    it('falls back to not-enough-evidence when the llm returns no matching field result', async () => {
        runDeterministicDateValidationMock
            .mockReturnValueOnce({
                resolvedResults: [],
                unresolvedFields: [
                    baseEvent.formFields[0],
                ] as DateValidationFieldInput[],
            })
            .mockReturnValueOnce({
                resolvedResults: [
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
                unresolvedFields: [],
            })

        parseValidationResponseMock.mockReturnValueOnce({
            normalizedRawText: '[]',
            results: [
                {
                    field: 'contractEndDate',
                    outcome: 'match',
                    confidence: 'medium',
                    message: 'Wrong field.',
                    decisionSource: 'llm',
                    citations: [],
                },
            ],
        })

        await validationHandler(baseEvent)

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                llmDiagnostics: [
                    {
                        field: 'contractStartDate',
                        issue: 'missing-field-result',
                        message:
                            'Validation model returned no result for contractStartDate',
                    },
                ],
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'not-enough-evidence',
                        confidence: 'low',
                        message:
                            'No mention of contract start date in retrieved document chunks.',
                        decisionSource: 'llm',
                        citations: [],
                    },
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
            })
        )

        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'complete',
                artifactVersion: 'artifact-v1',
                error: null,
            })
        )
    })

    it('falls back to not-enough-evidence when the llm returns malformed JSON', async () => {
        runDeterministicDateValidationMock
            .mockReturnValueOnce({
                resolvedResults: [],
                unresolvedFields: [
                    baseEvent.formFields[0],
                ] as DateValidationFieldInput[],
            })
            .mockReturnValueOnce({
                resolvedResults: [
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
                unresolvedFields: [],
            })

        parseValidationResponseMock.mockImplementationOnce(() => {
            const error = new Error('Failed to parse validation JSON')
            ;(error as Error & { issue?: string }).issue = 'invalid-json'
            throw error
        })

        await validationHandler(baseEvent)

        expect(putJsonMock).toHaveBeenCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationResultKey('test-form'),
            expect.objectContaining({
                llmDiagnostics: [
                    {
                        field: 'contractStartDate',
                        issue: 'invalid-json',
                        message: 'Failed to parse validation JSON',
                    },
                ],
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'not-enough-evidence',
                        confidence: 'low',
                        message:
                            'No mention of contract start date in retrieved document chunks.',
                        decisionSource: 'llm',
                        citations: [],
                    },
                    {
                        field: 'contractEndDate',
                        outcome: 'match',
                        confidence: 'high',
                        message:
                            'Document text includes end date December 31, 2025.',
                        decisionSource: 'deterministic',
                        citations: [
                            {
                                chunkId: 'contract-a.pdf::chunk-0',
                                documentName: 'contract-a.pdf',
                                page: null,
                                order: 0,
                            },
                        ],
                    },
                ],
            })
        )
    })
})
