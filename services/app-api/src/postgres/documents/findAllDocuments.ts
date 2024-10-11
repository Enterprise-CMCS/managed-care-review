import type { PrismaClient } from '@prisma/client'

export async function findAllDocuments(
    client: PrismaClient
): Promise<void | Error> {
    return new Error('not implemented')
}
