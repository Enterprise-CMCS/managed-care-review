import type { AuditDocument } from '../../domain-models'
import { auditDocumentSchema } from '../../domain-models'
import type { z } from 'zod'
import type { ExtendedPrismaClient } from '../prismaClient'

export async function findAllDocuments(
    client: ExtendedPrismaClient
): Promise<AuditDocument[] | Error> {
    try {
        const [
            contractDocs,
            rateDocs,
            contractSupportingDocs,
            rateSupportingDocs,
            contractQuestionDocs,
            contractQuestionResponseDocs,
            rateQuestionDocs,
            rateQuestionResponseDocs,
        ] = await Promise.all([
            getContractDocuments(client),
            getRateDocuments(client),
            getContractSupportingDocuments(client),
            getRateSupportingDocuments(client),
            getContractQuestionDocument(client),
            getContractQuestionResponseDocument(client),
            getRateQuestionDocument(client),
            getRateQuestionResponseDocument(client),
        ])
        if (contractDocs instanceof Error) return contractDocs
        if (rateDocs instanceof Error) return rateDocs
        if (contractSupportingDocs instanceof Error)
            return contractSupportingDocs
        if (rateSupportingDocs instanceof Error) return rateSupportingDocs
        if (contractQuestionDocs instanceof Error) return contractQuestionDocs
        if (contractQuestionResponseDocs instanceof Error)
            return contractQuestionResponseDocs

        if (rateQuestionDocs instanceof Error) return rateQuestionDocs
        if (rateQuestionResponseDocs instanceof Error)
            return rateQuestionResponseDocs

        const allDocs = [
            ...contractDocs.map((doc) => ({
                ...doc,
                type: 'CONTRACT_DOC' as const,
            })),
            ...rateDocs.map((doc) => ({ ...doc, type: 'RATE_DOC' as const })),
            ...contractSupportingDocs.map((doc) => ({
                ...doc,
                type: 'CONTRACT_SUPPORTING_DOC' as const,
            })),
            ...rateSupportingDocs.map((doc) => ({
                ...doc,
                type: 'RATE_SUPPORTING_DOC' as const,
            })),
            ...contractQuestionDocs.map((doc) => ({
                ...doc,
                type: 'CONTRACT_QUESTION_DOC' as const,
            })),
            ...contractQuestionResponseDocs.map((doc) => ({
                ...doc,
                type: 'CONTRACT_QUESTION_RESPONSE_DOC' as const,
            })),
            ...rateQuestionDocs.map((doc) => ({
                ...doc,
                type: 'RATE_QUESTION_DOC' as const,
            })),
            ...rateQuestionResponseDocs.map((doc) => ({
                ...doc,
                type: 'RATE_QUESTION_RESPONSE_DOC' as const,
            })),
        ]

        console.info(`Got some docs back: ${JSON.stringify(allDocs)}`)
        const parsedDocs = allDocs.map((doc) =>
            auditDocumentSchema.safeParse(doc)
        )
        console.info(`Got some parsed docs: ${JSON.stringify(parsedDocs)}`)
        console.info(`Got ${parsedDocs.length} parsed docs back`)

        const validDocs: AuditDocument[] = []
        const errors: z.ZodError[] = []

        parsedDocs.forEach((result) => {
            if (result.success) {
                validDocs.push(result.data)
            } else {
                errors.push(result.error)
            }
        })
        if (errors.length > 0) {
            return new Error(
                `Failed to parse ${errors.length} documents: ${errors.map((e) => e.message).join(', ')}`
            )
        }

        return validDocs
    } catch (err) {
        console.error('Error fetching documents:', err)
        return err
    }
}

async function getContractDocuments(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.contractDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            contractRevisionID: doc.contractRevisionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch contract documents')
    }
}

async function getRateDocuments(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.rateDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            rateRevisionID: doc.rateRevisionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch rate documents')
    }
}

async function getContractSupportingDocuments(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.contractSupportingDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            contractRevisionID: doc.contractRevisionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch contract supporting documents')
    }
}

async function getRateSupportingDocuments(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.rateSupportingDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            rateRevisionID: doc.rateRevisionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch rate supporting documents')
    }
}

async function getContractQuestionDocument(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.contractQuestionDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            questionID: doc.questionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch contract question documents')
    }
}

async function getContractQuestionResponseDocument(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.contractQuestionResponseDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            responseID: doc.responseID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch contract question response documents')
    }
}

async function getRateQuestionDocument(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.rateQuestionDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            questionID: doc.questionID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch rate question documents')
    }
}

async function getRateQuestionResponseDocument(
    prisma: PrismaClient
): Promise<Omit<AuditDocument, 'type'>[] | Error> {
    try {
        const docs = await prisma.rateQuestionResponseDocument.findMany()
        return docs.map((doc) => ({
            ...doc,
            responseID: doc.responseID,
        }))
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch rate question response documents')
    }
}
