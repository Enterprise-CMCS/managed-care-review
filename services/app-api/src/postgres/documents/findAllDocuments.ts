import type { PrismaClient } from '@prisma/client'
import type { DocumentType } from '../../domain-models'

export async function findAllDocuments(
    client: PrismaClient
): Promise<DocumentType[] | Error> {
    try {
        const allContractDocs = await client.contractDocument.findMany()
        return allContractDocs
    } catch (err) {
        const error = new Error(`Could not fetch all documents from pg: ${err}`)
        console.error(error)
        return error
    }
}
