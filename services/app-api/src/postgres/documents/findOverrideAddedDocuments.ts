import type { AuditDocument } from '../../domain-models'
import type { DocumentTypes } from '../../domain-models/DocumentType'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'

type OverrideAddedDocument = AuditDocument & {
    type:
        | 'CONTRACT_DOC'
        | 'CONTRACT_SUPPORTING_DOC'
        | 'RATE_DOC'
        | 'RATE_SUPPORTING_DOC'
}

type OverrideAddedDocumentType = OverrideAddedDocument['type']

const isOverrideAddedDocumentType = (
    docType?: DocumentTypes
): docType is OverrideAddedDocumentType => {
    return (
        docType === undefined ||
        docType === 'CONTRACT_DOC' ||
        docType === 'CONTRACT_SUPPORTING_DOC' ||
        docType === 'RATE_DOC' ||
        docType === 'RATE_SUPPORTING_DOC'
    )
}

export async function findOverrideAddedDocumentById(
    client: ExtendedPrismaClient,
    documentID: string,
    docType?: DocumentTypes
): Promise<OverrideAddedDocument | undefined | Error> {
    if (!isOverrideAddedDocumentType(docType)) {
        return undefined
    }

    const documents = await findAllOverrideAddedDocuments(client, docType)
    if (documents instanceof Error) {
        return documents
    }

    return documents.find((doc) => doc.id === documentID)
}

export async function findAllOverrideAddedDocuments(
    client: ExtendedPrismaClient,
    docType?: OverrideAddedDocumentType
): Promise<OverrideAddedDocument[] | Error> {
    try {
        const [
            contractDocs,
            contractSupportingDocs,
            rateDocs,
            rateSupportingDocs,
        ] = await Promise.all([
            docType === undefined || docType === 'CONTRACT_DOC'
                ? getContractDocumentOverrides(client)
                : [],
            docType === undefined || docType === 'CONTRACT_SUPPORTING_DOC'
                ? getContractSupportingDocumentOverrides(client)
                : [],
            docType === undefined || docType === 'RATE_DOC'
                ? getRateDocumentOverrides(client)
                : [],
            docType === undefined || docType === 'RATE_SUPPORTING_DOC'
                ? getRateSupportingDocumentOverrides(client)
                : [],
        ])

        return [
            ...contractDocs,
            ...contractSupportingDocs,
            ...rateDocs,
            ...rateSupportingDocs,
        ]
    } catch (err) {
        return parseErrorToError(err)
    }
}

async function getContractDocumentOverrides(
    prisma: ExtendedPrismaClient
): Promise<OverrideAddedDocument[]> {
    const docs = await prisma.contractDocumentOverride.findMany({
        where: { documentOp: 'ADD' },
        include: {
            contractRevisionOverride: {
                select: { contractRevisionID: true },
            },
        },
    })

    return docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        name: doc.name ?? '',
        s3URL: doc.s3URL ?? '',
        s3BucketName: doc.s3BucketName,
        s3Key: doc.s3Key,
        sha256: doc.sha256 ?? doc.documentSha256,
        contractRevisionID: doc.contractRevisionOverride.contractRevisionID,
        type: 'CONTRACT_DOC',
    }))
}

async function getContractSupportingDocumentOverrides(
    prisma: ExtendedPrismaClient
): Promise<OverrideAddedDocument[]> {
    const docs = await prisma.contractSupportingDocumentOverride.findMany({
        where: { documentOp: 'ADD' },
        include: {
            contractRevisionOverride: {
                select: { contractRevisionID: true },
            },
        },
    })

    return docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        name: doc.name ?? '',
        s3URL: doc.s3URL ?? '',
        s3BucketName: doc.s3BucketName,
        s3Key: doc.s3Key,
        sha256: doc.sha256 ?? doc.documentSha256,
        contractRevisionID: doc.contractRevisionOverride.contractRevisionID,
        type: 'CONTRACT_SUPPORTING_DOC',
    }))
}

async function getRateDocumentOverrides(
    prisma: ExtendedPrismaClient
): Promise<OverrideAddedDocument[]> {
    const docs = await prisma.rateDocumentOverride.findMany({
        where: { documentOp: 'ADD' },
        include: {
            rateRevisionOverride: {
                select: { rateRevisionID: true },
            },
        },
    })

    return docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        name: doc.name ?? '',
        s3URL: doc.s3URL ?? '',
        s3BucketName: doc.s3BucketName,
        s3Key: doc.s3Key,
        sha256: doc.sha256 ?? doc.documentSha256,
        rateRevisionID: doc.rateRevisionOverride.rateRevisionID,
        type: 'RATE_DOC',
    }))
}

async function getRateSupportingDocumentOverrides(
    prisma: ExtendedPrismaClient
): Promise<OverrideAddedDocument[]> {
    const docs = await prisma.rateSupportingDocumentOverride.findMany({
        where: { documentOp: 'ADD' },
        include: {
            rateRevisionOverride: {
                select: { rateRevisionID: true },
            },
        },
    })

    return docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        name: doc.name ?? '',
        s3URL: doc.s3URL ?? '',
        s3BucketName: doc.s3BucketName,
        s3Key: doc.s3Key,
        sha256: doc.sha256 ?? doc.documentSha256,
        rateRevisionID: doc.rateRevisionOverride.rateRevisionID,
        type: 'RATE_SUPPORTING_DOC',
    }))
}
