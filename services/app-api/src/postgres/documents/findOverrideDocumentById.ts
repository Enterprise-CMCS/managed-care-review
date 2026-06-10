import type {
    DocumentTypes,
    SharedDocument,
} from '../../domain-models/DocumentType'
import type { Prisma } from '../../generated/client'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'
import {
    mergeContractRevisionOverrides,
    mergeRateRevisionOverrides,
    type DocumentOverrideRow,
    type DocumentWithCommonFields,
} from '../prismaOverrideMergeHelpers'

export type OverrideDocumentType = Exclude<
    DocumentTypes,
    | 'CONTRACT_QUESTION_DOC'
    | 'CONTRACT_QUESTION_RESPONSE_DOC'
    | 'RATE_QUESTION_DOC'
    | 'RATE_QUESTION_RESPONSE_DOC'
>

const includeContractRevisionForOverrideDocumentLookup = {
    contractDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    supportingDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    revisionOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            contractRevisionID: true,
            contractType: true,
            contractTypeOp: true,
            contractDocuments: true,
            supportingDocuments: true,
        },
    },
} satisfies Prisma.ContractRevisionTableInclude

const includeRateRevisionForOverrideDocumentLookup = {
    rateDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    supportingDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    revisionOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            rateRevisionID: true,
            rateDocuments: true,
            supportingDocuments: true,
        },
    },
} satisfies Prisma.RateRevisionTableInclude

const documentToSharedDocument = (
    doc: DocumentWithCommonFields | undefined
): SharedDocument | undefined => {
    if (!doc) {
        return undefined
    }

    return {
        id: doc.id,
        name: doc.name,
        s3URL: doc.s3URL,
        sha256: doc.sha256,
        s3BucketName: doc.s3BucketName,
        s3Key: doc.s3Key,
    }
}

/**
 * Selects the requested effective document from a merged revision document
 * array.
 *
 * The requested id is an override row id, not always the effective document id.
 * ADD rows expose the override row id as the document id. OVERRIDE rows resolve
 * back to the base/effective document they target by documentID, or by sha256
 * when the target is unique. DELETE rows are intentionally treated as not
 * found.
 *
 * @param args.documents Effective documents returned by the revision merge.
 * @param args.targetRow Override row that was requested by id.
 */
const findDocumentFromMergedRevision = ({
    documents,
    targetRow,
}: {
    documents: DocumentWithCommonFields[]
    targetRow: DocumentOverrideRow
}): SharedDocument | undefined => {
    if (targetRow.documentOp === 'DELETE') {
        return undefined
    }

    if (targetRow.documentOp === 'ADD') {
        return documentToSharedDocument(
            documents.find((doc) => doc.id === targetRow.id)
        )
    }

    if (targetRow.documentID) {
        return documentToSharedDocument(
            documents.find((doc) => doc.id === targetRow.documentID)
        )
    }

    const matchingDocs = documents.filter(
        (doc) => doc.sha256 === targetRow.documentSha256
    )

    return documentToSharedDocument(
        matchingDocs.length === 1 ? matchingDocs[0] : undefined
    )
}

/**
 * Finds an effective document by override document row id.
 *
 * The caller must pass one of the overridable document types so this function
 * queries only the matching override table. ADD and OVERRIDE rows return the
 * effective merged document in SharedDocument shape; DELETE rows return
 * undefined.
 *
 * @param client Prisma client used for document and override lookups.
 * @param documentID Override document row id supplied by the client.
 * @param docType Override document table type to search.
 */
export async function findOverrideDocumentById(
    client: ExtendedPrismaClient,
    documentID: string,
    docType: OverrideDocumentType
): Promise<SharedDocument | undefined | Error> {
    try {
        switch (docType) {
            case 'CONTRACT_DOC':
                return await getContractDocumentOverrideById(client, documentID)
            case 'CONTRACT_SUPPORTING_DOC':
                return await getContractSupportingDocumentOverrideById(
                    client,
                    documentID
                )
            case 'RATE_DOC':
                return await getRateDocumentOverrideById(client, documentID)
            case 'RATE_SUPPORTING_DOC':
                return await getRateSupportingDocumentOverrideById(
                    client,
                    documentID
                )
        }
    } catch (err) {
        return parseErrorToError(err)
    }
}

/**
 * Resolves a contract document override row id to the effective document.
 *
 * Contract document override rows belong to a ContractRevisionOverrides row,
 * which points at the base contract revision. This loads that revision with its
 * override history and lets the same parser merge helper produce the effective
 * contractDocuments array.
 *
 * @param prisma Prisma client used for the lookup.
 * @param documentID ContractDocumentOverride row id.
 */
async function getContractDocumentOverrideById(
    prisma: ExtendedPrismaClient,
    documentID: string
): Promise<SharedDocument | undefined> {
    const targetRow = await prisma.contractDocumentOverride.findFirst({
        where: { id: documentID, documentOp: { not: 'DELETE' } },
        include: {
            contractRevisionOverride: {
                select: { contractRevisionID: true },
            },
        },
    })

    if (!targetRow) {
        return undefined
    }

    const revisionID = targetRow.contractRevisionOverride.contractRevisionID
    const revision = await prisma.contractRevisionTable.findUnique({
        where: { id: revisionID },
        include: includeContractRevisionForOverrideDocumentLookup,
    })

    if (!revision) {
        return undefined
    }

    const mergedRevision = mergeContractRevisionOverrides({
        revisionOverrides: revision.revisionOverrides,
        contractRevision: revision,
    })

    return findDocumentFromMergedRevision({
        documents: mergedRevision.contractDocuments,
        targetRow: targetRow as DocumentOverrideRow,
    })
}

/**
 * Resolves a contract supporting document override row id to the effective
 * document.
 *
 * Contract supporting document overrides use the same revision-level merge path
 * as contract documents, but select from the effective supportingDocuments array
 * after merging.
 *
 * @param prisma Prisma client used for the lookup.
 * @param documentID ContractSupportingDocumentOverride row id.
 */
async function getContractSupportingDocumentOverrideById(
    prisma: ExtendedPrismaClient,
    documentID: string
): Promise<SharedDocument | undefined> {
    const targetRow = await prisma.contractSupportingDocumentOverride.findFirst(
        {
            where: { id: documentID, documentOp: { not: 'DELETE' } },
            include: {
                contractRevisionOverride: {
                    select: { contractRevisionID: true },
                },
            },
        }
    )

    if (!targetRow) {
        return undefined
    }

    const revisionID = targetRow.contractRevisionOverride.contractRevisionID
    const revision = await prisma.contractRevisionTable.findUnique({
        where: { id: revisionID },
        include: includeContractRevisionForOverrideDocumentLookup,
    })

    if (!revision) {
        return undefined
    }

    const mergedRevision = mergeContractRevisionOverrides({
        revisionOverrides: revision.revisionOverrides,
        contractRevision: revision,
    })

    return findDocumentFromMergedRevision({
        documents: mergedRevision.supportingDocuments,
        targetRow: targetRow as DocumentOverrideRow,
    })
}

/**
 * Resolves a rate document override row id to the effective document.
 *
 * Rate document override rows point through RateRevisionOverrides to their base
 * rate revision. This loads the revision with override history, merges through
 * the parser helper, and selects from the effective rateDocuments array.
 *
 * @param prisma Prisma client used for the lookup.
 * @param documentID RateDocumentOverride row id.
 */
async function getRateDocumentOverrideById(
    prisma: ExtendedPrismaClient,
    documentID: string
): Promise<SharedDocument | undefined> {
    const targetRow = await prisma.rateDocumentOverride.findFirst({
        where: { id: documentID, documentOp: { not: 'DELETE' } },
        include: {
            rateRevisionOverride: {
                select: { rateRevisionID: true },
            },
        },
    })

    if (!targetRow) {
        return undefined
    }

    const revisionID = targetRow.rateRevisionOverride.rateRevisionID
    const revision = await prisma.rateRevisionTable.findUnique({
        where: { id: revisionID },
        include: includeRateRevisionForOverrideDocumentLookup,
    })

    if (!revision) {
        return undefined
    }

    const mergedRevision = mergeRateRevisionOverrides({
        revisionOverrides: revision.revisionOverrides,
        rateRevision: revision,
    })

    return findDocumentFromMergedRevision({
        documents: mergedRevision.rateDocuments,
        targetRow: targetRow as DocumentOverrideRow,
    })
}

/**
 * Resolves a rate supporting document override row id to the effective
 * document.
 *
 * Rate supporting document overrides follow the same rate revision merge as
 * rate document overrides, but select from the effective supportingDocuments
 * array after merging.
 *
 * @param prisma Prisma client used for the lookup.
 * @param documentID RateSupportingDocumentOverride row id.
 */
async function getRateSupportingDocumentOverrideById(
    prisma: ExtendedPrismaClient,
    documentID: string
): Promise<SharedDocument | undefined> {
    const targetRow = await prisma.rateSupportingDocumentOverride.findFirst({
        where: { id: documentID, documentOp: { not: 'DELETE' } },
        include: {
            rateRevisionOverride: {
                select: { rateRevisionID: true },
            },
        },
    })

    if (!targetRow) {
        return undefined
    }

    const revisionID = targetRow.rateRevisionOverride.rateRevisionID
    const revision = await prisma.rateRevisionTable.findUnique({
        where: { id: revisionID },
        include: includeRateRevisionForOverrideDocumentLookup,
    })

    if (!revision) {
        return undefined
    }

    const mergedRevision = mergeRateRevisionOverrides({
        revisionOverrides: revision.revisionOverrides,
        rateRevision: revision,
    })

    return findDocumentFromMergedRevision({
        documents: mergedRevision.supportingDocuments,
        targetRow: targetRow as DocumentOverrideRow,
    })
}
