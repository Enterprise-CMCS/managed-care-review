import { PrismaClient } from '../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const errorMessages = {
    delete: 'Deletion of records is not allowed',
    create: 'Creation of new records is not allowed',
}

/**
 * Extends PrismaClient with custom behavior for specific models.
 *
 * Overrides delete and create operations on `applicationSettings` and `emailSettings`
 * models to throw custom error messages.
 *
 * @param optionArgs - Prisma adapter configuration with PrismaPg adapter
 * @param optionArgs.adapter - PrismaPg adapter instance with pg.Pool
 * @returns Extended PrismaClient instance with custom query behaviors
 */
function extendedPrismaClient(optionArgs: { adapter: PrismaPg }) {
    return new PrismaClient(optionArgs).$extends({
        query: {
            applicationSettings: {
                delete: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.delete}`
                    )
                },
                deleteMany: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.delete}`
                    )
                },
                create: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.create}`
                    )
                },
                createMany: () => {
                    throw new Error(
                        `ApplicationSettings: ${errorMessages.create}`
                    )
                },
            },
            emailSettings: {
                delete: () => {
                    throw new Error(`EmailSettings: ${errorMessages.delete}`)
                },
                deleteMany: () => {
                    throw new Error(`EmailSettings: ${errorMessages.delete}`)
                },
                create: () => {
                    throw new Error(`EmailSettings: ${errorMessages.create}`)
                },
                createMany: () => {
                    throw new Error(`EmailSettings: ${errorMessages.create}`)
                },
            },
        },
    })
}

type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>

/**
 * Module-level singleton cache for Prisma clients by connection URL
 * Prevents connection pool leaks in Lambda warm containers by reusing clients
 */
const prismaClientCache = new Map<string, ExtendedPrismaClient>()

/**
 * Gets or creates a Prisma client for the given connection URL
 *
 * IMPORTANT: Uses singleton pattern to prevent connection pool leaks in Lambda.
 * Each Lambda warm container reuses the same Prisma client across invocations.
 *
 * @param connURL - PostgreSQL connection string
 * @returns Cached or new ExtendedPrismaClient instance
 */
async function NewPrismaClient(
    connURL: string
): Promise<ExtendedPrismaClient | Error> {
    try {
        // Check if we already have a client for this connection URL
        const cached = prismaClientCache.get(connURL)
        if (cached) {
            console.info(
                'Reusing cached Prisma client for warm Lambda container'
            )
            return cached
        }

        console.info(
            'Creating new Prisma client (cold start or new connection URL)'
        )
        const pool = new pg.Pool({ connectionString: connURL })
        const adapter = new PrismaPg(pool)

        const prismaClient = extendedPrismaClient({
            adapter,
        })

        // Cache for future invocations in this warm container
        prismaClientCache.set(connURL, prismaClient)

        return prismaClient
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.info('Unexpected Error creating prisma client: ', e)
        return new Error('Unknown error create prisma client')
    }
}

/**
 * Disconnects and clears all cached Prisma clients
 * Primarily used in tests to ensure clean state between test runs
 */
async function disconnectAllPrismaClients(): Promise<void> {
    console.info(
        `Disconnecting ${prismaClientCache.size} cached Prisma client(s)`
    )
    for (const client of prismaClientCache.values()) {
        try {
            await client.$disconnect()
            // Avoid logging connection URL that may contain credentials
            console.info('Disconnected Prisma client')
        } catch (err) {
            console.error('Error disconnecting Prisma client:', err)
        }
    }
    prismaClientCache.clear()
}

export { NewPrismaClient, disconnectAllPrismaClients }
export type { ExtendedPrismaClient }
