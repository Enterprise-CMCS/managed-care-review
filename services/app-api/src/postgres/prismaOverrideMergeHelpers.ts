import type {
    ArrayFieldOverrideOperation,
    ContractDocument,
    ContractSupportingDocument,
    ContractType,
    RateDocument,
    RateSupportingDocument,
    ScalarFieldOverrideOperation,
} from '../generated/client'
import { z } from 'zod'
import { logError } from '../logger'
import {
    contractFormDataSchema,
    type ContractFormDataType,
    type RateFormDataType,
} from '../domain-models/contractAndRates'
import type { ContractRevisionOverridesTablePayload } from './contractAndRates/prismaSubmittedContractHelpers'
import type { RateRevisionOverridesTablePayload } from './contractAndRates/prismaSubmittedRateHelpers'

/**
 * Validates a scalar field override before the store writes it.
 *
 * The operation column carries intent and the value column carries payload:
 * OVERRIDE may carry a value, CLEAR_OVERRIDE must not, and a value without an
 * operation is invalid. The valueSchema owns type validation and nullability.
 *
 * @param args.fieldName Field name used in validation error messages.
 * @param args.operation Scalar field operation supplied by the client.
 * @param args.value Payload value supplied for OVERRIDE.
 * @param args.valueSchema Zod schema for the field value, including whether null is allowed.
 */
const validateScalarOverrideInput = ({
    fieldName,
    operation,
    value,
    valueSchema,
}: {
    fieldName: string
    operation?: ScalarFieldOverrideOperation | null
    value?: unknown | null
    valueSchema: z.ZodType
}): Error | undefined => {
    if (operation == null && value == null) {
        return undefined
    }

    if (operation == null && value != null) {
        return new Error(
            `Invalid ${fieldName} override: value cannot be provided without an operation.`
        )
    }

    if (operation !== 'OVERRIDE' && operation !== 'CLEAR_OVERRIDE') {
        return new Error(
            `Invalid ${fieldName} override: unsupported operation ${String(operation)}.`
        )
    }

    if (operation === 'CLEAR_OVERRIDE' && value != null) {
        return new Error(
            `Invalid ${fieldName} override: CLEAR_OVERRIDE cannot carry a value.`
        )
    }

    if (operation === 'OVERRIDE') {
        const parsedValue = valueSchema.safeParse(value)
        if (!parsedValue.success) {
            return new Error(
                `Invalid ${fieldName} override: OVERRIDE value failed schema validation. Zod error: ${parsedValue.error.message}`
            )
        }
    }

    return undefined
}

type DocumentOverrideValueSchemas = {
    dateAdded: z.ZodType<Date>
}

type EffectiveDocumentOverrideDocs =
    | ContractFormDataType['contractDocuments']
    | ContractFormDataType['supportingDocuments']
    | NonNullable<RateFormDataType['rateDocuments']>
    | NonNullable<RateFormDataType['supportingDocuments']>

type DocumentOverrideType =
    | 'CONTRACT_DOCUMENTS'
    | 'CONTRACT_SUPPORTING_DOCUMENTS'
    | 'RATE_DOCUMENTS'
    | 'RATE_SUPPORTING_DOCUMENTS'

/**
 * Validates the document-level dateAdded scalar override.
 *
 * @param doc Document override row whose dateAdded/dateAddedOp pair is being checked.
 * @param valueSchemas Zod schemas for supported scalar fields inside document overrides.
 */
const validateDocumentDateAddedOverride = (
    doc: DocumentOverrideInput,
    valueSchemas: DocumentOverrideValueSchemas
): Error | undefined => {
    const scalarValidation = validateScalarOverrideInput({
        fieldName: 'dateAdded',
        operation: doc.dateAddedOp,
        value: doc.dateAdded,
        valueSchema: valueSchemas.dateAdded,
    })
    if (scalarValidation) {
        return new Error(
            `${scalarValidation.message} Override: ${JSON.stringify(doc)}`
        )
    }
    return undefined
}

type DocumentOverrideInput = {
    documentOp: ArrayFieldOverrideOperation
    documentSha256: string
    documentID?: string | null
    name?: string | null
    sha256?: string | null
    s3URL?: string | null
    s3BucketName?: string | null
    s3Key?: string | null
    dateAddedOp?: ScalarFieldOverrideOperation | null
    dateAdded?: Date | null
}

/**
 * Clears documentID when the client sent an effective id for an override-added doc.
 *
 * Clients see base documents and override-added documents in the same response
 * shape. For override-added documents, `id` is the override row id used for
 * fetch/download fallback, not a base document FK. documentSha256 remains the
 * merge target, and only stored base document ids are preserved in documentID.
 *
 * @param args.overrideDocs Client-submitted document override rows.
 * @param args.effectiveDocs Client-visible documents after previous overrides have been merged.
 * @param args.baseDocumentIDs Stored base document table ids that are valid documentID FK values.
 */
const normalizeDocumentOverrideInputs = ({
    overrideDocs,
    effectiveDocs,
    baseDocumentIDs,
}: {
    overrideDocs: DocumentOverrideInput[]
    effectiveDocs: EffectiveDocumentOverrideDocs
    baseDocumentIDs: Set<string>
}): DocumentOverrideInput[] => {
    return overrideDocs.map((doc) => {
        if (!doc.documentID || doc.documentOp === 'ADD') {
            return doc
        }

        const targetDoc = effectiveDocs.find(
            (effectiveDoc) =>
                effectiveDoc.id === doc.documentID &&
                effectiveDoc.sha256 === doc.documentSha256
        )

        if (
            targetDoc?.id === doc.documentID &&
            !baseDocumentIDs.has(doc.documentID)
        ) {
            return {
                ...doc,
                documentID: null,
            }
        }

        return doc
    })
}

/**
 * Validates document override rows before the store writes them.
 *
 * Document rows have item-level operations keyed by documentSha256. ADD must
 * provide a full document payload, OVERRIDE may only patch supported scalar
 * fields today, and DELETE must only identify the effective document to remove.
 *
 * @param args.overrideDocs Normalized document override rows to validate.
 * @param args.effectiveDocs Client-visible documents after previous overrides have been merged; documentSha256 targets this list.
 * @param args.baseDocumentIDs Stored base document table ids that are valid documentID FK values.
 * @param args.documentType Document collection label used in validation error messages.
 * @param args.valueSchemas Zod schemas for supported scalar fields inside document overrides.
 */
const validateDocumentOverrideInputs = ({
    overrideDocs,
    effectiveDocs,
    baseDocumentIDs,
    documentType,
    valueSchemas,
}: {
    overrideDocs: DocumentOverrideInput[]
    effectiveDocs: EffectiveDocumentOverrideDocs
    baseDocumentIDs: Set<string>
    documentType: DocumentOverrideType
    valueSchemas: DocumentOverrideValueSchemas
}): Error | undefined => {
    const overrideDocSha256s = new Set<string>()
    for (const doc of overrideDocs) {
        if (!doc.documentSha256) {
            return new Error(
                `Invalid ${documentType} override: documentSha256 is required. Override: ${JSON.stringify(doc)}`
            )
        }

        if (overrideDocSha256s.has(doc.documentSha256)) {
            return new Error(
                `Invalid ${documentType} override: only one override row is allowed per documentSha256 in a single override event. Duplicate documentSha256: ${doc.documentSha256}. Override: ${JSON.stringify(doc)}`
            )
        }
        overrideDocSha256s.add(doc.documentSha256)

        const matchingEffectiveDocs = effectiveDocs.filter(
            (existingDoc) => existingDoc.sha256 === doc.documentSha256
        )
        const effectiveDoc = doc.documentID
            ? matchingEffectiveDocs.find(
                  (existingDoc) => existingDoc.id === doc.documentID
              )
            : matchingEffectiveDocs.length === 1
              ? matchingEffectiveDocs[0]
              : undefined

        if (doc.documentOp === 'ADD') {
            const scalarValidation = validateDocumentDateAddedOverride(
                doc,
                valueSchemas
            )
            if (scalarValidation) {
                return scalarValidation
            }

            if (doc.documentID) {
                return new Error(
                    `Invalid ${documentType} override: ADD cannot carry documentID. Override: ${JSON.stringify(doc)}`
                )
            }

            if (matchingEffectiveDocs.length > 0) {
                return new Error(
                    `Invalid ${documentType} override: ADD cannot target an existing effective documentSha256. Override: ${JSON.stringify(doc)}`
                )
            }

            if (!doc.name || !doc.sha256 || !doc.s3URL) {
                return new Error(
                    `Invalid ${documentType} override: ADD requires name, sha256, and s3URL. Override: ${JSON.stringify(doc)}`
                )
            }

            if (doc.sha256 !== doc.documentSha256) {
                return new Error(
                    `Invalid ${documentType} override: ADD documentSha256 must match payload sha256. Override: ${JSON.stringify(doc)}`
                )
            }
        } else if (doc.documentOp === 'OVERRIDE') {
            const scalarValidation = validateDocumentDateAddedOverride(
                doc,
                valueSchemas
            )
            if (scalarValidation) {
                return scalarValidation
            }

            if (!doc.documentID && matchingEffectiveDocs.length > 1) {
                return new Error(
                    `Invalid ${documentType} override: OVERRIDE target documentSha256 matches multiple effective documents; documentID is required. Override: ${JSON.stringify(doc)}`
                )
            }

            if (doc.documentID && !baseDocumentIDs.has(doc.documentID)) {
                return new Error(
                    `Invalid ${documentType} override: documentID does not match the document identified by documentSha256. Override-added document IDs are only accepted when they match the documentSha256 target and are normalized before write. Override: ${JSON.stringify(doc)}`
                )
            }

            if (!effectiveDoc) {
                if (doc.documentID && matchingEffectiveDocs.length > 0) {
                    return new Error(
                        `Invalid ${documentType} override: documentID must match the effective document identified by documentSha256. Override: ${JSON.stringify(doc)}`
                    )
                }

                return new Error(
                    `Invalid ${documentType} override: OVERRIDE target documentSha256 does not exist in the effective document list. Override: ${JSON.stringify(doc)}`
                )
            }

            if (doc.documentID) {
                // documentID is only meaningful when it survived normalization
                // as a known stored base document id. Non-base effective ids
                // from override-added documents should already be nulled out.
                if (effectiveDoc.id !== doc.documentID) {
                    return new Error(
                        `Invalid ${documentType} override: documentID must match the effective document identified by documentSha256. Override: ${JSON.stringify(doc)}`
                    )
                }
            }

            if (
                doc.name != null ||
                doc.sha256 != null ||
                doc.s3URL != null ||
                doc.s3BucketName != null ||
                doc.s3Key != null
            ) {
                return new Error(
                    `Invalid ${documentType} override: OVERRIDE may only carry scalar field patches today; name, sha256, s3URL, s3BucketName, and s3Key must be null. Override: ${JSON.stringify(doc)}`
                )
            }
        } else if (doc.documentOp === 'DELETE') {
            if (!doc.documentID && matchingEffectiveDocs.length > 1) {
                return new Error(
                    `Invalid ${documentType} override: DELETE target documentSha256 matches multiple effective documents; documentID is required. Override: ${JSON.stringify(doc)}`
                )
            }

            if (doc.documentID && !baseDocumentIDs.has(doc.documentID)) {
                return new Error(
                    `Invalid ${documentType} override: documentID does not match the document identified by documentSha256. Override-added document IDs are only accepted when they match the documentSha256 target and are normalized before write. Override: ${JSON.stringify(doc)}`
                )
            }

            if (!effectiveDoc) {
                if (doc.documentID && matchingEffectiveDocs.length > 0) {
                    return new Error(
                        `Invalid ${documentType} override: documentID must match the effective document identified by documentSha256. Override: ${JSON.stringify(doc)}`
                    )
                }

                return new Error(
                    `Invalid ${documentType} override: DELETE target documentSha256 does not exist in the effective document list. Override: ${JSON.stringify(doc)}`
                )
            }

            if (doc.documentID) {
                // See the OVERRIDE branch above: non-base effective ids should
                // be normalized to null before validation.
                if (effectiveDoc.id !== doc.documentID) {
                    return new Error(
                        `Invalid ${documentType} override: documentID must match the effective document identified by documentSha256. Override: ${JSON.stringify(doc)}`
                    )
                }
            }

            if (
                doc.name != null ||
                doc.sha256 != null ||
                doc.s3URL != null ||
                doc.s3BucketName != null ||
                doc.s3Key != null ||
                doc.dateAddedOp != null ||
                doc.dateAdded != null
            ) {
                return new Error(
                    `Invalid ${documentType} override: DELETE cannot carry document payload or scalar field patches. Override: ${JSON.stringify(doc)}`
                )
            }
        } else {
            return new Error(
                `Invalid ${documentType} override: unsupported documentOp ${String(doc.documentOp)}. Override: ${JSON.stringify(doc)}`
            )
        }
    }
    return undefined
}

type ScalarOverrideResult<T> =
    | {
          hasOverride: false
      }
    | {
          hasOverride: true
          value: T
      }

/**
 * Applies one scalar override row to the accumulated field state.
 *
 * This is used on read/merge paths, so invalid persisted rows are logged and
 * ignored rather than thrown. Write paths should reject those states before
 * insert.
 *
 * @param args.currentOverride Accumulated override state before this row is applied.
 * @param args.operation Scalar field operation from the override row.
 * @param args.value Payload value from the override row.
 * @param args.valueSchema Zod schema for parsing the payload value.
 * @param args.fieldPath Human-readable field path used in error logs.
 * @param args.overrideID Override row id used in error logs.
 */
const applyScalarFieldOverride = <T>({
    currentOverride,
    operation,
    value,
    valueSchema,
    fieldPath,
    overrideID,
}: {
    currentOverride: ScalarOverrideResult<T>
    operation?: ScalarFieldOverrideOperation | null
    value?: unknown
    valueSchema: z.ZodType<T>
    fieldPath: string
    overrideID: string
}): ScalarOverrideResult<T> => {
    if (operation == null) {
        if (value != null) {
            logError(
                'prismaOverrideMergeHelpers.applyScalarFieldOverride',
                `${fieldPath}: overrideID ${overrideID} value was present without an operation; ignoring value`
            )
        }
        return currentOverride
    }

    if (operation === 'CLEAR_OVERRIDE') {
        return { hasOverride: false }
    }

    if (operation === 'OVERRIDE') {
        const parsedValue = valueSchema.safeParse(value)
        if (!parsedValue.success) {
            logError(
                'prismaOverrideMergeHelpers.applyScalarFieldOverride',
                `${fieldPath}: overrideID ${overrideID} OVERRIDE value failed schema validation; ignoring operation. Zod error: ${parsedValue.error.message}`
            )
            return currentOverride
        }

        return { hasOverride: true, value: parsedValue.data }
    }

    logError(
        'prismaOverrideMergeHelpers.applyScalarFieldOverride',
        `${fieldPath}: overrideID ${overrideID} unsupported scalar field operation ${String(operation)}`
    )
    return currentOverride
}

/**
 * Merges a scalar field across many override rows in createdAt order.
 *
 * Later rows win for OVERRIDE, while CLEAR_OVERRIDE removes any previously
 * active override. The valueSchema owns both value type validation and
 * nullability on read.
 *
 * @param args.rows Override rows to merge in createdAt order.
 * @param args.getOperation Reads the scalar operation from one override row.
 * @param args.getValue Reads the scalar payload value from one override row.
 * @param args.valueSchema Zod schema for parsing payload values.
 * @param args.fieldPath Human-readable field path used in error logs.
 */
const mergeScalarFieldOverrides = <
    T,
    Row extends { id: string; createdAt: Date },
>({
    rows,
    getOperation,
    getValue,
    valueSchema,
    fieldPath,
}: {
    rows: Row[]
    getOperation: (row: Row) => ScalarFieldOverrideOperation | null | undefined
    getValue: (row: Row) => unknown
    valueSchema: z.ZodType<T>
    fieldPath: string
}): ScalarOverrideResult<T> => {
    const ordered = [...rows].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    let currentOverride: ScalarOverrideResult<T> = { hasOverride: false }
    for (const row of ordered) {
        currentOverride = applyScalarFieldOverride({
            currentOverride,
            operation: getOperation(row),
            value: getValue(row),
            valueSchema,
            fieldPath,
            overrideID: row.id,
        })
    }

    return currentOverride
}

type DocumentOverrideRow = {
    id: string
    createdAt: Date
    documentOp: 'OVERRIDE' | 'ADD' | 'DELETE'
    documentSha256: string
    documentID?: string | null
    name?: string | null
    sha256?: string | null
    s3URL?: string | null
    s3BucketName?: string | null
    s3Key?: string | null
    dateAdded?: Date | null
    dateAddedOp?: ScalarFieldOverrideOperation | null
}

type DocumentWithCommonFields = {
    id: string
    createdAt: Date
    updatedAt: Date
    position: number
    name: string
    s3URL: string
    sha256: string
    s3BucketName: string | null
    s3Key: string | null
    dateAdded: Date | null
}

/**
 * Narrows an ADD document override row to the minimum payload required to
 * synthesize an effective document.
 *
 * @param row Document override row being checked for ADD payload completeness.
 */
const isDocumentAddPayloadComplete = (
    row: DocumentOverrideRow
): row is DocumentOverrideRow & {
    name: string
    sha256: string
    s3URL: string
} => {
    return row.name != null && row.sha256 != null && row.s3URL != null
}

/**
 * Applies scalar field overrides inside one document override row.
 *
 * Today this only handles dateAdded. CLEAR_OVERRIDE restores the value from the
 * document's base state, which is either the stored base document or the
 * original ADD payload for override-added documents.
 *
 * @param doc Current effective document before this row's scalar patches.
 * @param baseDoc Base document value used when CLEAR_OVERRIDE is applied.
 * @param row Document override row carrying scalar field operations.
 * @param context Human-readable field context used in error logs.
 */
const applyDocumentScalarOverrides = <T extends DocumentWithCommonFields>(
    doc: T,
    baseDoc: T,
    row: DocumentOverrideRow,
    context: string
): T => {
    let dateAdded = doc.dateAdded
    if (row.dateAddedOp == null) {
        if (row.dateAdded != null) {
            logError(
                'prismaOverrideMergeHelpers.applyDocumentScalarOverrides',
                `${context}.dateAdded: value was present without an operation; ignoring value`
            )
        }
    } else if (row.dateAddedOp === 'CLEAR_OVERRIDE') {
        dateAdded = baseDoc.dateAdded
    } else if (row.dateAddedOp === 'OVERRIDE') {
        const parsedDateAdded = z.date().safeParse(row.dateAdded)
        if (!parsedDateAdded.success) {
            logError(
                'prismaOverrideMergeHelpers.applyDocumentScalarOverrides',
                `${context}.dateAdded: OVERRIDE value failed schema validation; ignoring operation. Zod error: ${parsedDateAdded.error.message}`
            )
        } else {
            dateAdded = parsedDateAdded.data
        }
    } else {
        logError(
            'prismaOverrideMergeHelpers.applyDocumentScalarOverrides',
            `${context}.dateAdded: unsupported scalar field operation ${String(row.dateAddedOp)}`
        )
    }

    return {
        ...doc,
        dateAdded,
    }
}

/**
 * Merges contract document override rows into a contract document array.
 *
 * This is used for both contractDocuments and supportingDocuments. The caller
 * supplies the contractRevisionID so override-added rows can be shaped like the
 * concrete Prisma document table rows.
 *
 * @param originalDocs Stored base contract document rows.
 * @param overrideRows Contract document override rows to apply.
 * @param contractRevisionID Contract revision id used on synthesized ADD rows.
 */
const mergeContractDocumentOverrides = <
    T extends ContractDocument | ContractSupportingDocument,
>(
    originalDocs: T[],
    overrideRows: (
        | ContractRevisionOverridesTablePayload['contractDocuments'][number]
        | ContractRevisionOverridesTablePayload['supportingDocuments'][number]
    )[],
    contractRevisionID: string
): T[] => {
    return mergeDocumentOverrides({
        originalDocs,
        overrideRows,
        createAddedDocument: (row) =>
            ({
                ...createDocumentFromAddOverrideRow(row),
                contractRevisionID,
            }) as T,
        fieldPath: 'mergeContractDocumentOverrides',
    })
}

/**
 * Converts a validated ADD override row into the common effective document
 * shape used by the merge helpers.
 *
 * The override row id becomes the effective document id so client-facing
 * document lookups can address override-added documents.
 *
 * @param row Validated ADD document override row.
 */
const createDocumentFromAddOverrideRow = (
    row: DocumentOverrideRow
): DocumentWithCommonFields => {
    const stamp = row.createdAt
    return {
        id: row.id,
        createdAt: stamp,
        updatedAt: stamp,
        position: -1,
        name: row.name as string,
        s3URL: row.s3URL as string,
        sha256: row.sha256 as string,
        s3BucketName: row.s3BucketName ?? null,
        s3Key: row.s3Key ?? null,
        dateAdded:
            row.dateAddedOp === 'OVERRIDE' ? (row.dateAdded ?? null) : null,
    }
}

type DocumentMergeState<T extends DocumentWithCommonFields> = {
    docMap: Map<string, T>
    baseDocMap: Map<string, T>
    shaToKeys: Map<string, Set<string>>
    order: string[]
}

const baseDocumentMergeKey = (doc: DocumentWithCommonFields): string =>
    baseDocumentIDMergeKey(doc.id)

const baseDocumentIDMergeKey = (documentID: string): string =>
    `base:${documentID}`

const overrideDocumentMergeKey = (documentSha256: string): string =>
    `override:${documentSha256}`

const addDocumentKeyForSha = (
    shaToKeys: Map<string, Set<string>>,
    sha256: string,
    key: string
) => {
    const keys = shaToKeys.get(sha256) ?? new Set<string>()
    keys.add(key)
    shaToKeys.set(sha256, keys)
}

const removeDocumentKeyForSha = (
    shaToKeys: Map<string, Set<string>>,
    sha256: string,
    key: string
) => {
    const keys = shaToKeys.get(sha256)
    if (!keys) {
        return
    }

    keys.delete(key)
    if (keys.size === 0) {
        shaToKeys.delete(sha256)
    }
}

const findDocumentMergeKey = <T extends DocumentWithCommonFields>({
    state,
    row,
    fieldPath,
    overrideID,
}: {
    state: DocumentMergeState<T>
    row: DocumentOverrideRow
    fieldPath: string
    overrideID: string
}): string | undefined => {
    if (row.documentID) {
        const key = baseDocumentIDMergeKey(row.documentID)
        if (!state.docMap.has(key)) {
            logError(
                'prismaOverrideMergeHelpers.findDocumentMergeKey',
                `${fieldPath}: overrideID ${overrideID} target not found for documentID ${row.documentID}; ignoring row`
            )
            return undefined
        }
        return key
    }

    const keys = state.shaToKeys.get(row.documentSha256)
    if (!keys || keys.size === 0) {
        logError(
            'prismaOverrideMergeHelpers.findDocumentMergeKey',
            `${fieldPath}: overrideID ${overrideID} target not found for documentSha256 ${row.documentSha256}; ignoring row`
        )
        return undefined
    }

    if (keys.size > 1) {
        logError(
            'prismaOverrideMergeHelpers.findDocumentMergeKey',
            `${fieldPath}: overrideID ${overrideID} documentSha256 ${row.documentSha256} matched multiple documents without documentID; ignoring row`
        )
        return undefined
    }

    return [...keys][0]
}

/**
 * Creates the mutable merge state for one document array.
 *
 * docMap holds the current effective documents, baseDocMap holds the value
 * CLEAR_OVERRIDE should restore to, and order preserves base document order
 * while allowing override-added documents to append.
 *
 * @param originalDocs Stored base document rows that seed the merge state.
 */
const createDocumentMergeState = <T extends DocumentWithCommonFields>(
    originalDocs: T[]
): DocumentMergeState<T> => {
    const state: DocumentMergeState<T> = {
        docMap: new Map(),
        baseDocMap: new Map(),
        shaToKeys: new Map(),
        order: [],
    }

    for (const doc of originalDocs) {
        const key = baseDocumentMergeKey(doc)
        state.docMap.set(key, doc)
        state.baseDocMap.set(key, doc)
        addDocumentKeyForSha(state.shaToKeys, doc.sha256, key)
        state.order.push(key)
    }

    return state
}

/**
 * Converts document merge state back into an ordered effective document array.
 *
 * Deleted documents are absent from docMap, so they are filtered out while the
 * original ordering keys remain stable.
 *
 * @param state Current document merge state after applying override rows.
 */
const documentMergeStateToDocuments = <T extends DocumentWithCommonFields>(
    state: DocumentMergeState<T>
): T[] => {
    return state.order.flatMap((key) => {
        const doc = state.docMap.get(key)
        return doc ? [doc] : []
    })
}

/**
 * Applies one document override row to an in-progress document merge state.
 *
 * This is the shared row-level primitive for document override behavior. The
 * document-only merge uses it to apply flat document override rows. Contract
 * and rate revision merges use it while applying each full revision override
 * event. The generic preserves the caller's concrete document row type while
 * the operation logic only depends on common document fields.
 *
 * @param args.state Current document merge state before this row is applied.
 * @param args.row Document override row to apply.
 * @param args.createAddedDocument Converts an ADD row into the caller's document row type.
 * @param args.fieldPath Human-readable document array path used in error logs.
 * @param args.overrideID Override row id used in error logs.
 */
const applySingleDocumentOverride = <T extends DocumentWithCommonFields>({
    state,
    row,
    createAddedDocument,
    fieldPath,
    overrideID,
}: {
    state: DocumentMergeState<T>
    row: DocumentOverrideRow
    createAddedDocument: (row: DocumentOverrideRow) => T
    fieldPath: string
    overrideID: string
}): DocumentMergeState<T> => {
    const key = row.documentSha256

    // Every document override row must identify the document array item by the
    // merge key. Invalid persisted rows are ignored on read.
    if (!key) {
        logError(
            'prismaOverrideMergeHelpers.applySingleDocumentOverride',
            `${fieldPath}: overrideID ${overrideID} missing documentSha256; ignoring row`
        )
        return state
    }

    // ADD synthesizes a new effective document from the override payload and
    // tracks it as the base for later field clears on the same override-added doc.
    if (row.documentOp === 'ADD') {
        if (!isDocumentAddPayloadComplete(row)) {
            logError(
                'prismaOverrideMergeHelpers.applySingleDocumentOverride',
                `${fieldPath}: overrideID ${overrideID} ADD missing required document payload; ignoring row`
            )
            return state
        }

        if (state.shaToKeys.has(key)) {
            logError(
                'prismaOverrideMergeHelpers.applySingleDocumentOverride',
                `${fieldPath}: overrideID ${overrideID} ADD target documentSha256 ${key} already exists; ignoring row`
            )
            return state
        }

        const addedDoc = createAddedDocument(row)
        const mergeKey = overrideDocumentMergeKey(key)
        state.docMap.set(mergeKey, addedDoc)
        state.baseDocMap.set(mergeKey, addedDoc)
        addDocumentKeyForSha(state.shaToKeys, addedDoc.sha256, mergeKey)
        if (!state.order.includes(mergeKey)) {
            state.order.push(mergeKey)
        }
        return state
    }

    // OVERRIDE patches the current effective document. Field-level clears use
    // baseDocMap so original docs return to stored base data and added docs
    // return to their ADD payload.
    if (row.documentOp === 'OVERRIDE') {
        if (
            row.name != null ||
            row.sha256 != null ||
            row.s3URL != null ||
            row.s3BucketName != null ||
            row.s3Key != null
        ) {
            logError(
                'prismaOverrideMergeHelpers.applySingleDocumentOverride',
                `${fieldPath}: overrideID ${overrideID} OVERRIDE carried unsupported document payload fields; ignoring unsupported payload`
            )
        }

        const mergeKey = findDocumentMergeKey({
            state,
            row,
            fieldPath,
            overrideID,
        })
        if (!mergeKey) {
            return state
        }
        const existing = state.docMap.get(mergeKey)
        if (!existing) {
            return state
        }

        const patched = applyDocumentScalarOverrides(
            existing,
            state.baseDocMap.get(mergeKey) ?? existing,
            row,
            `${fieldPath}.dateAdded: overrideID ${overrideID}`
        )
        state.docMap.set(mergeKey, patched)
        return state
    }

    // DELETE removes the item from the effective array without deleting the
    // stored base document or earlier override history.
    if (row.documentOp === 'DELETE') {
        const mergeKey = findDocumentMergeKey({
            state,
            row,
            fieldPath,
            overrideID,
        })
        if (!mergeKey) {
            return state
        }
        const existing = state.docMap.get(mergeKey)
        if (existing) {
            removeDocumentKeyForSha(state.shaToKeys, existing.sha256, mergeKey)
        }
        state.docMap.delete(mergeKey)
        return state
    }

    logError(
        'prismaOverrideMergeHelpers.applySingleDocumentOverride',
        `${fieldPath}: overrideID ${overrideID} unsupported document operation ${String(row.documentOp)}`
    )
    return state
}

/**
 * Sparse-merges document override rows into a base document array.
 *
 * The generic is intentional here: contract documents, contract supporting
 * documents, rate documents, and rate supporting documents all share the fields
 * needed for merge behavior, but each table has a different revision foreign key
 * and override relation. `T` preserves the caller's concrete document row type
 * while this function only reads and writes the common document fields.
 *
 * @param args.originalDocs Stored base document rows.
 * @param args.overrideRows Document override rows to sparse-merge over the base rows.
 * @param args.createAddedDocument Converts an ADD row into the caller's document row type.
 * @param args.fieldPath Human-readable document array path used in error logs.
 */
const mergeDocumentOverrides = <T extends DocumentWithCommonFields>({
    originalDocs,
    overrideRows,
    createAddedDocument,
    fieldPath,
}: {
    originalDocs: T[]
    overrideRows: DocumentOverrideRow[]
    createAddedDocument: (row: DocumentOverrideRow) => T
    fieldPath: string
}): T[] => {
    const ordered = [...overrideRows].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )
    let state = createDocumentMergeState(originalDocs)

    for (const row of ordered) {
        state = applySingleDocumentOverride({
            state,
            row,
            createAddedDocument,
            fieldPath,
            overrideID: row.id,
        })
    }

    return documentMergeStateToDocuments(state)
}

type MergedContractScalarFieldOverrides = {
    contractType: ScalarOverrideResult<ContractType>
}

type ContractScalarFieldOverrideRow = {
    id: string
    createdAt: Date
    contractType: ContractType | null
    contractTypeOp: ScalarFieldOverrideOperation | null
}

type ContractRevisionOverrideRow = ContractScalarFieldOverrideRow & {
    contractDocuments: ContractRevisionOverridesTablePayload['contractDocuments']
    supportingDocuments: ContractRevisionOverridesTablePayload['supportingDocuments']
}

/**
 * Merges contract revision-level scalar overrides for stripped contract reads.
 *
 * Stripped contract queries do not select document override rows, so this only
 * returns scalar field override state.
 *
 * @param revisionOverrideRows Contract revision override rows containing scalar field operations.
 */
const mergeStrippedContractRevisionOverrides = (
    revisionOverrideRows: ContractScalarFieldOverrideRow[]
): MergedContractScalarFieldOverrides => {
    return {
        contractType: mergeScalarFieldOverrides({
            rows: revisionOverrideRows,
            getOperation: (row) => row.contractTypeOp,
            getValue: (row) => row.contractType,
            valueSchema: contractFormDataSchema.shape.contractType,
            fieldPath: 'ContractRevisionOverrides.contractType',
        }),
    }
}

type MergedContractRevisionOverrides = MergedContractScalarFieldOverrides & {
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
}

type ContractRevisionOverrideMergeInput = {
    id: string
    contractDocuments?: ContractDocument[] | null
    supportingDocuments?: ContractSupportingDocument[] | null
}

/**
 * Merges all override rows that apply to one full contract revision.
 *
 * Each ContractRevisionOverrides row is treated as one override event. The
 * helper applies scalar revision fields and both document arrays in createdAt
 * order so the final result mirrors the effective client-facing form data.
 *
 * @param args.revisionOverrides Contract revision override events to apply.
 * @param args.contractRevision Stored base contract revision being overlaid.
 */
const mergeContractRevisionOverrides = ({
    revisionOverrides,
    contractRevision,
}: {
    revisionOverrides: ContractRevisionOverrideRow[]
    contractRevision: ContractRevisionOverrideMergeInput
}): MergedContractRevisionOverrides => {
    // Each revision override is a single override event. Apply them in creation
    // order so later events can override or clear earlier events.
    const ordered = [...revisionOverrides].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Start from the stored base revision state, then accumulate effective
    // scalar field overrides and document array changes into these states.
    let mergedOverride: MergedContractScalarFieldOverrides = {
        contractType: { hasOverride: false },
    }
    let contractDocumentState: DocumentMergeState<ContractDocument> | undefined
    let supportingDocumentState:
        | DocumentMergeState<ContractSupportingDocument>
        | undefined

    for (const row of ordered) {
        // Apply revision-level scalar field operations from this override row.
        // Add new scalar fields to this object when the DB gains new op/value
        // columns on ContractRevisionOverrides.
        mergedOverride = {
            ...mergedOverride,
            contractType: applyScalarFieldOverride({
                currentOverride: mergedOverride.contractType,
                operation: row.contractTypeOp,
                value: row.contractType,
                valueSchema: contractFormDataSchema.shape.contractType,
                fieldPath: 'ContractRevisionOverrides.contractType',
                overrideID: row.id,
            }),
        }

        // Apply item-level document operations from the same override event.
        // This keeps ADD/OVERRIDE/DELETE ordered relative to the scalar fields
        // and any other document rows in this revision override.
        for (const docRow of row.contractDocuments) {
            contractDocumentState ??= createDocumentMergeState(
                contractRevision.contractDocuments ?? []
            )
            contractDocumentState = applySingleDocumentOverride({
                state: contractDocumentState,
                row: docRow,
                createAddedDocument: (documentOverrideRow) =>
                    ({
                        ...createDocumentFromAddOverrideRow(
                            documentOverrideRow
                        ),
                        contractRevisionID: contractRevision.id,
                    }) as ContractDocument,
                fieldPath: 'ContractRevisionOverrides.contractDocuments',
                overrideID: docRow.id,
            })
        }

        // Supporting documents are a separate array, so they keep their own
        // merge state even though they use the same row operation semantics.
        for (const docRow of row.supportingDocuments) {
            supportingDocumentState ??= createDocumentMergeState(
                contractRevision.supportingDocuments ?? []
            )
            supportingDocumentState = applySingleDocumentOverride({
                state: supportingDocumentState,
                row: docRow,
                createAddedDocument: (documentOverrideRow) =>
                    ({
                        ...createDocumentFromAddOverrideRow(
                            documentOverrideRow
                        ),
                        contractRevisionID: contractRevision.id,
                    }) as ContractSupportingDocument,
                fieldPath: 'ContractRevisionOverrides.supportingDocuments',
                overrideID: docRow.id,
            })
        }
    }

    // Convert document merge maps back into arrays while preserving original
    // order for base docs and append order for override-added docs.
    return {
        ...mergedOverride,
        contractDocuments: contractDocumentState
            ? documentMergeStateToDocuments(contractDocumentState)
            : (contractRevision.contractDocuments ?? []),
        supportingDocuments: supportingDocumentState
            ? documentMergeStateToDocuments(supportingDocumentState)
            : (contractRevision.supportingDocuments ?? []),
    }
}

type MergedRateRevisionOverrides = {
    rateDocuments: RateDocument[]
    supportingDocuments: RateSupportingDocument[]
}

type RateRevisionOverrideMergeInput = {
    id: string
    rateDocuments?: RateDocument[] | null
    supportingDocuments?: RateSupportingDocument[] | null
}

/**
 * Merges all override rows that apply to one full rate revision.
 *
 * Rate revision overrides currently contain document array operations only, but
 * this follows the same event-order merge model as contract revisions.
 *
 * @param args.revisionOverrides Rate revision override events to apply.
 * @param args.rateRevision Stored base rate revision being overlaid.
 */
const mergeRateRevisionOverrides = ({
    revisionOverrides,
    rateRevision,
}: {
    revisionOverrides: RateRevisionOverridesTablePayload[]
    rateRevision: RateRevisionOverrideMergeInput
}): MergedRateRevisionOverrides => {
    // Each revision override is a single override event. Apply them in creation
    // order so later document operations can override earlier events.
    const ordered = [...revisionOverrides].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Rate revision overrides currently only contain document array changes,
    // but use the same accumulated merge-state pattern as contract revisions.
    let rateDocumentState: DocumentMergeState<RateDocument> | undefined
    let supportingDocumentState:
        | DocumentMergeState<RateSupportingDocument>
        | undefined

    for (const row of ordered) {
        // Apply rate document operations from this override event.
        for (const docRow of row.rateDocuments) {
            rateDocumentState ??= createDocumentMergeState(
                rateRevision.rateDocuments ?? []
            )
            rateDocumentState = applySingleDocumentOverride({
                state: rateDocumentState,
                row: docRow,
                createAddedDocument: (documentOverrideRow) =>
                    ({
                        ...createDocumentFromAddOverrideRow(
                            documentOverrideRow
                        ),
                        rateRevisionID: rateRevision.id,
                    }) as RateDocument,
                fieldPath: 'RateRevisionOverrides.rateDocuments',
                overrideID: docRow.id,
            })
        }

        // Supporting documents are a separate array, so they keep their own
        // merge state even though they use the same row operation semantics.
        for (const docRow of row.supportingDocuments) {
            supportingDocumentState ??= createDocumentMergeState(
                rateRevision.supportingDocuments ?? []
            )
            supportingDocumentState = applySingleDocumentOverride({
                state: supportingDocumentState,
                row: docRow,
                createAddedDocument: (documentOverrideRow) =>
                    ({
                        ...createDocumentFromAddOverrideRow(
                            documentOverrideRow
                        ),
                        rateRevisionID: rateRevision.id,
                    }) as RateSupportingDocument,
                fieldPath: 'RateRevisionOverrides.supportingDocuments',
                overrideID: docRow.id,
            })
        }
    }

    // Convert document merge maps back into arrays while preserving original
    // order for base docs and append order for override-added docs.
    return {
        rateDocuments: rateDocumentState
            ? documentMergeStateToDocuments(rateDocumentState)
            : (rateRevision.rateDocuments ?? []),
        supportingDocuments: supportingDocumentState
            ? documentMergeStateToDocuments(supportingDocumentState)
            : (rateRevision.supportingDocuments ?? []),
    }
}

export {
    mergeContractDocumentOverrides,
    mergeDocumentOverrides,
    mergeContractRevisionOverrides,
    mergeRateRevisionOverrides,
    mergeScalarFieldOverrides,
    mergeStrippedContractRevisionOverrides,
    normalizeDocumentOverrideInputs,
    validateDocumentOverrideInputs,
    validateScalarOverrideInput,
}

export type { DocumentOverrideRow, DocumentWithCommonFields }
