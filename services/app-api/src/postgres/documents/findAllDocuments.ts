import type { PrismaClient } from '@prisma/client'
import type { AuditDocument } from '../../domain-models'
import { auditDocumentSchema } from '../../domain-models'
import type { z } from 'zod'

export async function findAllDocuments(
    client: PrismaClient
): Promise<AuditDocument[] | Error> {
    try {
        const [
            contractDocs,
            rateDocs,
            contractSupportingDocs,
            rateSupportingDocs,
        ] = await Promise.all([
            getContractDocuments(client),
            getRateDocuments(client),
            getContractSupportingDocuments(client),
            getRateSupportingDocuments(client),
        ])
        if (contractDocs instanceof Error) return contractDocs
        if (rateDocs instanceof Error) return rateDocs
        if (contractSupportingDocs instanceof Error)
            return contractSupportingDocs
        if (rateSupportingDocs instanceof Error) return rateSupportingDocs

        const allDocs = [
            ...contractDocs.map((doc) => ({
                ...doc,
                type: 'contractDoc' as const,
            })),
            ...rateDocs.map((doc) => ({ ...doc, type: 'rateDoc' as const })),
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
