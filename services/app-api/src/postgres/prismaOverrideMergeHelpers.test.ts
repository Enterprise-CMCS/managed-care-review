import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
    mergeContractDocumentOverrides,
    mergeScalarFieldOverrides,
    normalizeDocumentOverrideInputs,
    validateDocumentOverrideInputs,
    validateScalarOverrideInput,
} from './prismaOverrideMergeHelpers'

type TestScalarOverrideRow = {
    id: string
    createdAt: Date
    operation?: 'OVERRIDE' | 'CLEAR_OVERRIDE' | null
    value?: string | null
}

const mergeTestScalarOverrides = ({
    rows,
    valueSchema = z.string(),
}: {
    rows: TestScalarOverrideRow[]
    valueSchema?: z.ZodType<string | null>
}) =>
    mergeScalarFieldOverrides<string | null, TestScalarOverrideRow>({
        rows,
        getOperation: (row) => row.operation,
        getValue: (row) => row.value,
        valueSchema,
        fieldPath: 'TestScalarOverride.value',
    })

const validateTestScalarOverrideInput = (
    args: Omit<
        Parameters<typeof validateScalarOverrideInput>[0],
        'valueSchema'
    > & {
        valueSchema?: z.ZodType
    }
) =>
    validateScalarOverrideInput({
        ...args,
        valueSchema:
            args.valueSchema ??
            (args.fieldName === 'dateAdded' ? z.date().nullable() : z.string()),
    })

const validateTestDocumentOverrideInputs = (
    overrideDocs: Parameters<
        typeof validateDocumentOverrideInputs
    >[0]['overrideDocs'],
    effectiveDocs: Parameters<
        typeof validateDocumentOverrideInputs
    >[0]['effectiveDocs'],
    documentType: Parameters<
        typeof validateDocumentOverrideInputs
    >[0]['documentType'],
    valueSchemas = { dateAdded: z.date().nullable() },
    baseDocumentIDs = new Set(
        effectiveDocs.flatMap((doc) => (doc.id ? [doc.id] : []))
    )
) =>
    validateDocumentOverrideInputs({
        overrideDocs,
        effectiveDocs,
        baseDocumentIDs,
        documentType,
        valueSchemas,
    })

describe('validateScalarOverrideInput', () => {
    it('allows omitted operation and omitted value', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: null,
            value: null,
        })

        expect(result).toBeUndefined()
    })

    it('allows OVERRIDE with a non-null value', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: 'OVERRIDE',
            value: 'AMENDMENT',
        })

        expect(result).toBeUndefined()
    })

    it('allows OVERRIDE with null for nullable fields', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'dateAdded',
            operation: 'OVERRIDE',
            value: null,
        })

        expect(result).toBeUndefined()
    })

    it('rejects value without operation', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: null,
            value: 'AMENDMENT',
        })

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'value cannot be provided without an operation'
        )
    })

    it('rejects unsupported operations', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: 'BAD_OPERATION' as 'OVERRIDE',
            value: 'AMENDMENT',
        })

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain('unsupported operation BAD_OPERATION')
    })

    it('rejects CLEAR_OVERRIDE with a value', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: 'CLEAR_OVERRIDE',
            value: 'AMENDMENT',
        })

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain('CLEAR_OVERRIDE cannot carry a value')
    })

    it('rejects OVERRIDE with null for non-nullable fields', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: 'OVERRIDE',
            value: null,
        })

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'OVERRIDE value failed schema validation'
        )
    })

    it('rejects OVERRIDE with the wrong value type', () => {
        const result = validateTestScalarOverrideInput({
            fieldName: 'contractType',
            operation: 'OVERRIDE',
            value: 123,
        })

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'OVERRIDE value failed schema validation'
        )
    })
})

describe('validateDocumentOverrideInputs', () => {
    const effectiveDocs = [
        {
            id: 'base-doc-1',
            name: 'base doc',
            s3URL: 's3://bucket/base-doc',
            sha256: 'base-sha',
        },
    ]

    it('allows ADD for a new document with complete payload', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'ADD',
                    documentSha256: 'new-sha',
                    name: 'new doc',
                    sha256: 'new-sha',
                    s3URL: 's3://bucket/new-doc',
                },
            ],
            effectiveDocs,
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeUndefined()
    })

    it('allows OVERRIDE with nullable dateAdded scalar override', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                    dateAddedOp: 'OVERRIDE',
                    dateAdded: null,
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS'
        )

        expect(result).toBeUndefined()
    })

    it('allows DELETE for an existing document without payload fields', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'DELETE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                },
            ],
            effectiveDocs,
            'RATE_DOCUMENTS'
        )

        expect(result).toBeUndefined()
    })

    it('rejects missing documentSha256', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'ADD',
                    documentSha256: '',
                    name: 'new doc',
                    sha256: 'new-sha',
                    s3URL: 's3://bucket/new-doc',
                },
            ],
            effectiveDocs,
            'RATE_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain('Invalid RATE_DOCUMENTS override')
        expect(result?.message).toContain('documentSha256 is required')
    })

    it('rejects duplicate documentSha256 rows in one override event', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                },
                {
                    documentOp: 'DELETE',
                    documentSha256: 'base-sha',
                },
            ],
            effectiveDocs,
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'only one override row is allowed per documentSha256'
        )
        expect(result?.message).toContain('Duplicate documentSha256: base-sha')
    })

    it('allows duplicate effective document sha256 values when documentID disambiguates the target', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-2',
                },
            ],
            [
                ...effectiveDocs,
                {
                    id: 'base-doc-2',
                    name: 'duplicate base doc',
                    s3URL: 's3://bucket/duplicate-base-doc',
                    sha256: 'base-sha',
                },
            ],
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeUndefined()
    })

    it('rejects ambiguous OVERRIDE when documentSha256 matches multiple effective documents', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                },
            ],
            [
                ...effectiveDocs,
                {
                    id: 'base-doc-2',
                    name: 'duplicate base doc',
                    s3URL: 's3://bucket/duplicate-base-doc',
                    sha256: 'base-sha',
                },
            ],
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'OVERRIDE target documentSha256 matches multiple effective documents; documentID is required'
        )
    })

    it('rejects ADD targeting an existing base document', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'ADD',
                    documentSha256: 'base-sha',
                    name: 'existing doc',
                    sha256: 'base-sha',
                    s3URL: 's3://bucket/existing-doc',
                },
            ],
            effectiveDocs,
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'ADD cannot target an existing effective documentSha256'
        )
    })

    it('rejects ADD with incomplete payload', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'ADD',
                    documentSha256: 'new-sha',
                    name: 'new doc',
                    sha256: 'new-sha',
                },
            ],
            effectiveDocs,
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'ADD requires name, sha256, and s3URL'
        )
    })

    it('rejects dateAdded value without dateAddedOp', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                    dateAdded: new Date('2026-01-01T00:00:00.000Z'),
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1', 'wrong-doc-id'])
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'value cannot be provided without an operation'
        )
        expect(result?.message).toContain('Override:')
    })

    it('rejects CLEAR_OVERRIDE with dateAdded value', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                    dateAddedOp: 'CLEAR_OVERRIDE',
                    dateAdded: new Date('2026-01-01T00:00:00.000Z'),
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain('CLEAR_OVERRIDE cannot carry a value')
    })

    it('rejects dateAdded OVERRIDE with the wrong value type', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                    dateAddedOp: 'OVERRIDE',
                    dateAdded: '2026-01-01' as unknown as Date,
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'OVERRIDE value failed schema validation'
        )
        expect(result?.message).toContain('Override:')
    })

    it('rejects OVERRIDE targeting a missing document', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'missing-sha',
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'OVERRIDE target documentSha256 does not exist in the effective document list'
        )
    })

    it('rejects documentID mismatch for target documentSha256', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    documentID: 'wrong-doc-id',
                },
            ],
            effectiveDocs,
            'CONTRACT_SUPPORTING_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1', 'wrong-doc-id'])
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'documentID must match the effective document identified by documentSha256'
        )
    })

    it('allows targeting an override-added document by documentSha256 without documentID', () => {
        const overrideAddedDocs = [
            ...effectiveDocs,
            {
                id: 'override-row-doc-1',
                name: 'override-added doc',
                s3URL: 's3://bucket/override-added-doc',
                sha256: 'override-added-sha',
            },
        ]

        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'override-added-sha',
                    dateAddedOp: 'OVERRIDE',
                    dateAdded: null,
                },
            ],
            overrideAddedDocs,
            'CONTRACT_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1'])
        )

        expect(result).toBeUndefined()
    })

    it('normalizes documentID away when targeting an override-added document', () => {
        const overrideAddedDocs = [
            ...effectiveDocs,
            {
                id: 'override-row-doc-1',
                name: 'override-added doc',
                s3URL: 's3://bucket/override-added-doc',
                sha256: 'override-added-sha',
            },
        ]

        const normalizedDocs = normalizeDocumentOverrideInputs({
            overrideDocs: [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'override-added-sha',
                    documentID: 'override-row-doc-1',
                },
            ],
            effectiveDocs: overrideAddedDocs,
            baseDocumentIDs: new Set(['base-doc-1']),
        })

        expect(normalizedDocs[0].documentID).toBeNull()

        const result = validateTestDocumentOverrideInputs(
            normalizedDocs,
            overrideAddedDocs,
            'CONTRACT_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1'])
        )

        expect(result).toBeUndefined()
    })

    it('allows DELETE for an override-added document after normalization', () => {
        const overrideAddedDocs = [
            ...effectiveDocs,
            {
                id: 'override-row-doc-1',
                name: 'override-added doc',
                s3URL: 's3://bucket/override-added-doc',
                sha256: 'override-added-sha',
            },
        ]

        const normalizedDocs = normalizeDocumentOverrideInputs({
            overrideDocs: [
                {
                    documentOp: 'DELETE',
                    documentSha256: 'override-added-sha',
                    documentID: 'override-row-doc-1',
                },
            ],
            effectiveDocs: overrideAddedDocs,
            baseDocumentIDs: new Set(['base-doc-1']),
        })

        expect(normalizedDocs[0].documentID).toBeNull()

        const result = validateTestDocumentOverrideInputs(
            normalizedDocs,
            overrideAddedDocs,
            'CONTRACT_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1'])
        )

        expect(result).toBeUndefined()
    })

    it('rejects ADD with documentID', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'ADD',
                    documentSha256: 'new-sha',
                    documentID: 'base-doc-1',
                    name: 'new doc',
                    sha256: 'new-sha',
                    s3URL: 's3://bucket/new-doc',
                },
            ],
            effectiveDocs,
            'CONTRACT_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain('ADD cannot carry documentID')
    })

    it('rejects conflicting documentID for an override-added documentSha256 target', () => {
        const overrideAddedDocs = [
            ...effectiveDocs,
            {
                id: 'override-row-doc-1',
                name: 'override-added doc',
                s3URL: 's3://bucket/override-added-doc',
                sha256: 'override-added-sha',
            },
        ]

        const normalizedDocs = normalizeDocumentOverrideInputs({
            overrideDocs: [
                {
                    documentOp: 'OVERRIDE',
                    documentSha256: 'override-added-sha',
                    documentID: 'unknown-doc-id',
                },
            ],
            effectiveDocs: overrideAddedDocs,
            baseDocumentIDs: new Set(['base-doc-1']),
        })

        expect(normalizedDocs[0].documentID).toBe('unknown-doc-id')

        const result = validateTestDocumentOverrideInputs(
            normalizedDocs,
            overrideAddedDocs,
            'CONTRACT_DOCUMENTS',
            { dateAdded: z.date().nullable() },
            new Set(['base-doc-1'])
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'documentID does not match the document identified by documentSha256'
        )
    })

    it('rejects DELETE with document payload fields', () => {
        const result = validateTestDocumentOverrideInputs(
            [
                {
                    documentOp: 'DELETE',
                    documentSha256: 'base-sha',
                    documentID: 'base-doc-1',
                    name: 'deleted doc',
                },
            ],
            effectiveDocs,
            'RATE_DOCUMENTS'
        )

        expect(result).toBeInstanceOf(Error)
        expect(result?.message).toContain(
            'DELETE cannot carry document payload or scalar field patches'
        )
    })
})

describe('mergeScalarFieldOverrides', () => {
    it('returns no override when there are no rows', () => {
        const result = mergeTestScalarOverrides({ rows: [] })

        expect(result).toEqual({ hasOverride: false })
    })

    it('applies an OVERRIDE row', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
            ],
        })

        expect(result).toEqual({ hasOverride: true, value: 'first' })
    })

    it('sorts rows by createdAt before merging so later rows win', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-2',
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'second',
                },
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
            ],
        })

        expect(result).toEqual({ hasOverride: true, value: 'second' })
    })

    it('clears a prior override with CLEAR_OVERRIDE', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
                {
                    id: 'row-2',
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    operation: 'CLEAR_OVERRIDE',
                    value: null,
                },
            ],
        })

        expect(result).toEqual({ hasOverride: false })
    })

    it('allows OVERRIDE with null for nullable fields', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: null,
                },
            ],
            valueSchema: z.string().nullable(),
        })

        expect(result).toEqual({ hasOverride: true, value: null })
    })

    it('ignores OVERRIDE with null for non-nullable fields', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
                {
                    id: 'row-2',
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: null,
                },
            ],
        })

        expect(result).toEqual({ hasOverride: true, value: 'first' })
    })

    it('ignores a value without an operation', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
                {
                    id: 'row-2',
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    operation: null,
                    value: 'second',
                },
            ],
        })

        expect(result).toEqual({ hasOverride: true, value: 'first' })
    })

    it('ignores unsupported operations', () => {
        const result = mergeTestScalarOverrides({
            rows: [
                {
                    id: 'row-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    operation: 'OVERRIDE',
                    value: 'first',
                },
                {
                    id: 'row-2',
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    operation: 'BAD_OPERATION' as 'OVERRIDE',
                    value: 'second',
                },
            ],
        })

        expect(result).toEqual({ hasOverride: true, value: 'first' })
    })
})

describe('mergeContractDocumentOverrides', () => {
    it('ignores unsupported payload fields on persisted OVERRIDE rows', () => {
        const originalDateAdded = new Date('2026-01-01T00:00:00.000Z')
        const overrideDateAdded = new Date('2026-02-01T00:00:00.000Z')
        const originalDoc = {
            id: 'base-doc-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            position: 1,
            name: 'base doc',
            s3URL: 's3://bucket/base-doc',
            sha256: 'base-sha',
            s3BucketName: 'bucket',
            s3Key: 'base-key',
            dateAdded: originalDateAdded,
            contractRevisionID: 'contract-revision-1',
        }

        const result = mergeContractDocumentOverrides(
            [originalDoc],
            [
                {
                    id: 'override-row-1',
                    createdAt: new Date('2026-02-01T00:00:00.000Z'),
                    documentOp: 'OVERRIDE',
                    documentSha256: 'base-sha',
                    name: 'unsupported name',
                    s3URL: 's3://bucket/unsupported',
                    sha256: 'unsupported-sha',
                    s3BucketName: 'unsupported-bucket',
                    s3Key: 'unsupported-key',
                    dateAddedOp: 'OVERRIDE',
                    dateAdded: overrideDateAdded,
                },
            ] as never,
            'contract-revision-1'
        )

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
            ...originalDoc,
            dateAdded: overrideDateAdded,
        })
    })

    it('applies an override to only the matching documentID when base docs share sha256', () => {
        const originalDateAdded = new Date('2026-01-01T00:00:00.000Z')
        const overrideDateAdded = new Date('2026-02-01T00:00:00.000Z')
        const originalDocs = [
            {
                id: 'base-doc-1',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                position: 0,
                name: 'base doc 1',
                s3URL: 's3://bucket/base-doc-1',
                sha256: 'shared-sha',
                s3BucketName: 'bucket',
                s3Key: 'base-key-1',
                dateAdded: originalDateAdded,
                contractRevisionID: 'contract-revision-1',
            },
            {
                id: 'base-doc-2',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                position: 1,
                name: 'base doc 2',
                s3URL: 's3://bucket/base-doc-2',
                sha256: 'shared-sha',
                s3BucketName: 'bucket',
                s3Key: 'base-key-2',
                dateAdded: originalDateAdded,
                contractRevisionID: 'contract-revision-1',
            },
        ]

        const result = mergeContractDocumentOverrides(
            originalDocs,
            [
                {
                    id: 'override-row-1',
                    createdAt: new Date('2026-02-01T00:00:00.000Z'),
                    documentOp: 'OVERRIDE',
                    documentSha256: 'shared-sha',
                    documentID: 'base-doc-1',
                    dateAddedOp: 'OVERRIDE',
                    dateAdded: overrideDateAdded,
                },
            ] as never,
            'contract-revision-1'
        )

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
            ...originalDocs[0],
            dateAdded: overrideDateAdded,
        })
        expect(result[1]).toEqual(originalDocs[1])
    })
})
