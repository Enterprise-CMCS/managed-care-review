import { PrismaClient } from '@prisma/client'

async function NewPrismaClient(connURL: string): Promise<PrismaClient | Error> {
    try {
        const prismaClient = new PrismaClient({
            datasources: {
                db: {
                    url: connURL,
                },
            },
        })
        return prismaClient
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.log('Unexpected Error creating prisma client: ', e)
        return new Error('Unknown error create prisma client')
    }
}

export { NewPrismaClient }
