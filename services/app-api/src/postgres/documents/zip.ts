import type {
    DocumentZipType,
    DocumentZipPackage,
} from '../../generated/client'
import type { ExtendedPrismaClient } from '../prismaClient'
import { logError } from '../../logger'
import { parseErrorToError } from '@mc-review/helpers'

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
    client: ExtendedPrismaClient,
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
        const parsedError = parseErrorToError(error)
        logError('createDocumentZipPackage', parsedError)
        return new Error(
            `Failed to create document zip package: ${parsedError.message}`
        )
    }
}

/**
 * Persists a freshly generated zip without creating duplicate package rows.
 * Existing rows for the revision and document type are updated only after the
 * canonical zip upload succeeds. A missing row is created.
 */
export async function saveRegeneratedDocumentZipPackage(
    client: ExtendedPrismaClient,
    args: CreateDocumentZipPackageArgsType
): Promise<void | Error> {
    const hasContractRevision = args.contractRevisionID !== undefined
    const hasRateRevision = args.rateRevisionID !== undefined
    if (hasContractRevision === hasRateRevision) {
        return new Error(
            'Regenerated zip package requires exactly one revision ID'
        )
    }

    try {
        const revisionWhere = hasContractRevision
            ? { contractRevisionID: args.contractRevisionID }
            : { rateRevisionID: args.rateRevisionID }
        const updateResult = await client.documentZipPackage.updateMany({
            where: {
                ...revisionWhere,
                documentType: args.documentType,
            },
            data: {
                s3URL: args.s3URL,
                sha256: args.sha256,
                s3BucketName: args.s3BucketName,
                s3Key: args.s3Key,
            },
        })

        if (updateResult.count > 0) {
            return
        }

        const createResult = await createDocumentZipPackage(client, args)
        return createResult instanceof Error ? createResult : undefined
    } catch (error) {
        const parsedError = parseErrorToError(error)
        logError('saveRegeneratedDocumentZipPackage', parsedError)
        return new Error(
            `Failed to save regenerated document zip package: ${parsedError.message}`
        )
    }
}

/**
 * Finds document zip packages for a contract revision
 */
export async function findDocumentZipPackagesByContractRevision(
    client: ExtendedPrismaClient,
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
        const parsedError = parseErrorToError(error)
        logError('findDocumentZipPackagesByContractRevision', parsedError)
        return new Error(
            `Failed to find document zip packages: ${parsedError.message}`
        )
    }
}

/**
 * Finds document zip packages for a rate revision
 */
export async function findDocumentZipPackagesByRateRevision(
    client: ExtendedPrismaClient,
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
        const parsedError = parseErrorToError(error)
        logError('findDocumentZipPackagesByRateRevision', parsedError)
        return new Error(
            `Failed to find document zip packages: ${parsedError.message}`
        )
    }
}
