import type { PrismaClient } from '@prisma/client'
import type { DocumentType } from '../../domain-models'
import { documentSchema } from '../../domain-models'

export async function findAllDocuments(
    client: PrismaClient
): Promise<DocumentType[] | Error> {
    try {
        const allContractDocs = await client['contractDocument'].findMany()
        const parsedDocs = allContractDocs.map((doc) => {
            const result = documentSchema.safeParse(doc)
            if (!result.success) {
                console.error(
                    `Validation failed for document ${doc.id}:`,
                    result.error
                )
                return null
            }
            return result.data
        })

        return parsedDocs.filter((doc): doc is DocumentType => doc !== null)
    } catch (err) {
        const error = new Error(`Could not fetch all documents from pg: ${err}`)
        console.error(error)
        return error
    }
}
