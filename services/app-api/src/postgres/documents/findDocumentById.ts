import { findAllDocuments } from '.'
import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '..'
import type { AuditDocument } from '../../domain-models'

export async function findDocumentById(
    client: ExtendedPrismaClient,
    docID: string
): Promise<AuditDocument | NotFoundError | Error> {
    try {
        // fetch all the documents in the db
        const allDocs = await findAllDocuments(client)
        if (allDocs instanceof Error) {
            const err = `Fetching all documents failed: ${allDocs.message}`
            console.error(err)
            return new Error(err)
        }

        // find document by id
        const fetchedDoc = allDocs.find((doc) => doc.id === docID)
        if (!fetchedDoc) {
            const err = `PRISMA ERROR: Cannot find document with id: ${docID}`
            return new NotFoundError(err)
        }

        return fetchedDoc
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch document')
    }
}
