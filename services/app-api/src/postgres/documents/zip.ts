import type {
    DocumentZipType,
    DocumentZipPackage,
    PrismaClient,
} from '@prisma/client'
import type { PrismaTransactionType } from '../prismaTypes'
import { logError } from '../../logger'

// Define types for function arguments
export type CreateDocumentZipPackageArgsType = {
    s3URL: string
    sha256: string
    s3BucketName: string
    s3Key: string
    contractRevisionID?: string
    rateRevisionID?: string
    documentType: DocumentZipType
}

export type FindDocumentZipPackagesByRevisionArgsType = {
    contractRevisionID?: string
    rateRevisionID?: string
    documentType?: DocumentZipType
}

/**
 * Creates a document zip package record
 * Expects s3BucketName and s3Key to be provided by caller (parsed at API boundary)
 */
export async function createDocumentZipPackage(
    client: PrismaClient | PrismaTransactionType,
    args: CreateDocumentZipPackageArgsType
): Promise<DocumentZipPackage | Error> {
    try {
        if (!args.s3BucketName || !args.s3Key) {
            return new Error(
                'createDocumentZipPackage requires s3BucketName and s3Key to be provided'
            )
        }

        return await client.documentZipPackage.create({
            data: args,
        })
    } catch (error) {
        logError('createDocumentZipPackage', error)
        return new Error(
            `Failed to create document zip package: ${error.message}`
        )
    }
}

/**
 * Finds document zip packages for a contract revision
 */
export async function findDocumentZipPackagesByContractRevision(
    client: PrismaClient | PrismaTransactionType,
    contractRevisionID: string,
    documentType?: DocumentZipType
): Promise<DocumentZipPackage[] | Error> {
    try {
        const where: {
            contractRevisionID: string
            documentType?: DocumentZipType
        } = {
            contractRevisionID,
        }

        if (documentType) {
            where.documentType = documentType
        }

        return await client.documentZipPackage.findMany({ where })
    } catch (error) {
        logError('findDocumentZipPackagesByContractRevision', error)
        return new Error(
            `Failed to find document zip packages: ${error.message}`
        )
    }
}

/**
 * Finds document zip packages for a rate revision
 */
export async function findDocumentZipPackagesByRateRevision(
    client: PrismaClient | PrismaTransactionType,
    rateRevisionID: string,
    documentType?: DocumentZipType
): Promise<DocumentZipPackage[] | Error> {
    try {
        const where: {
            rateRevisionID: string
            documentType?: DocumentZipType
        } = {
            rateRevisionID,
        }

        if (documentType) {
            where.documentType = documentType
        }

        return await client.documentZipPackage.findMany({ where })
    } catch (error) {
        logError('findDocumentZipPackagesByRateRevision', error)
        return new Error(
            `Failed to find document zip packages: ${error.message}`
        )
    }
}
