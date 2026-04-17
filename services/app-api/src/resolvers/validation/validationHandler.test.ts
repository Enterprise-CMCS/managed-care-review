import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DateValidationFieldInput } from '../../../../ai-form-augmentation/src/prompts'

const {
    getBufferMock,
    putJsonMock,
    parsePdfMock,
    chunkDocumentMock,
    embedTextsMock,
    embedTextMock,
    generateValidationMock,
    parseValidationResponseMock,
    buildDateValidationPromptMock,
    runDeterministicDateValidationMock,
} = vi.hoisted(() => ({
    getBufferMock: vi.fn(),
    putJsonMock: vi.fn(),
    parsePdfMock: vi.fn(),
    chunkDocumentMock: vi.fn(),
    embedTextsMock: vi.fn(),
    embedTextMock: vi.fn(),
    generateValidationMock: vi.fn(),
    parseValidationResponseMock: vi.fn(),
    buildDateValidationPromptMock: vi.fn(() => 'test-prompt'),
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
        putJson: putJsonMock,
    })),
}))

vi.mock('../../../../ai-form-augmentation/src/parsing', () => ({
    parsePdf: parsePdfMock,
}))

vi.mock('../../../../ai-form-augmentation/src/chunking', () => ({
    chunkDocument: chunkDocumentMock,
}))

vi.mock('../../../../ai-form-augmentation/src/embeddings', () => ({
    XenovaEmbeddingProvider: vi.fn().mockImplementation(() => ({
        embedTexts: embedTextsMock,
        embedText: embedTextMock,
    })),
}))

vi.mock('../../../../ai-form-augmentation/src/llm', () => ({
    OllamaValidationClient: vi.fn().mockImplementation(() => ({
        generateValidation: generateValidationMock,
    })),
}))

vi.mock('../../../../ai-form-augmentation/src/prompts', () => ({
    buildDateValidationPrompt: buildDateValidationPromptMock,
}))

vi.mock('../../../../ai-form-augmentation/src/retrieval', () => ({
    orderRetrievedChunks: vi.fn(
        (
            results: Array<{
                id: string
                score: number
                metadata: unknown
            }>
        ) => results
    ),
}))

vi.mock('../../../../ai-form-augmentation/src/validation-output', () => ({
    runDeterministicDateValidation: runDeterministicDateValidationMock,
    parseValidationResponse: parseValidationResponseMock,
}))

import { getChunksArtifactKey } from '../../../../ai-form-augmentation/src/artifacts'
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

        getBufferMock.mockResolvedValue(Buffer.from('fake-pdf'))
        parsePdfMock.mockResolvedValue({
            fileName: 'contract-a.pdf',
            rawText: 'START DATE January 1, 2025 END DATE December 31, 2025',
            extractionMethod: 'pdf-text',
            extractionNotes: [],
        })
        chunkDocumentMock.mockReturnValue([
            {
                chunkId: 'contract-a.pdf::chunk-0',
                documentName: 'contract-a.pdf',
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
            'parse failure'
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
                error: 'parse failure',
            })
        )
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
                        message: 'Start date matches.',
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

    it('fails when the llm returns a result for the wrong field', async () => {
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

        await expect(validationHandler(baseEvent)).rejects.toThrow(
            'Validation model returned result for contractEndDate while validating contractStartDate'
        )

        expect(putJsonMock).toHaveBeenLastCalledWith(
            'ai-form-augmentation-artifacts',
            getValidationStatusKey('test-form'),
            expect.objectContaining({
                stage: 'failed',
                artifactVersion: 'artifact-v1',
            })
        )
    })
})
