import { type Prisma, PrismaClient } from '../generated/prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const errorMessages = {
    delete: 'Deletion of records is not allowed',
    create: 'Creation of new records is not allowed',
}

/**
 * Creates a PostgreSQL connection pool with appropriate settings for Lambda.
 *
 * @param {string} connURL - PostgreSQL connection string
 * @returns {Pool} Configured pg Pool instance
 */
function createConnectionPool(connURL: string): Pool {
    return new Pool({
        connectionString: connURL,
        // Lambda-optimized settings
        max: 5, // Lower for Lambda to avoid connection exhaustion
        idleTimeoutMillis: 60000, // 60s idle timeout
        connectionTimeoutMillis: 5000, // 5s connection timeout
    })
}

/**
 * Extends PrismaClient with custom behavior for specific models.
 *
 * Overrides delete and create operations on `applicationSettings` and `emailSettings`
 * models to throw custom error messages.
 *
 * @param {Prisma.PrismaClientOptions} optionArgs - PrismaClient configuration options.
 * @returns {PrismaClient} A new PrismaClient instance with extended behavior.
 */
function extendedPrismaClient(optionArgs: Prisma.PrismaClientOptions) {
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

async function NewPrismaClient(
    connURL: string
): Promise<ExtendedPrismaClient | Error> {
    try {
        // Create connection pool
        const pool = createConnectionPool(connURL)

        // Create Prisma driver adapter
        const adapter = new PrismaPg(pool)

        // Create Prisma Client with adapter
        const prismaClient = extendedPrismaClient({
            adapter,
            // Note: datasources.db.url is not needed when using adapter
        })

        return prismaClient
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.info('Unexpected Error creating prisma client: ', e)
        return new Error('Unknown error create prisma client')
    }
}

export { NewPrismaClient }
export type { ExtendedPrismaClient }
