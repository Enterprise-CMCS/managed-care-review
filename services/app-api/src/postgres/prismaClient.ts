import { type Prisma, PrismaClient } from '@prisma/client'
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
 * @param {Prisma.PrismaClientOptions} optionArgs - PrismaClient configuration options.
 * @returns {PrismaClient} A new PrismaClient instance with extended behavior.
 */
function extendedPrismaClient(optionArgs?: Prisma.PrismaClientOptions) {
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
        const pool = new pg.Pool({ connectionString: connURL })
        const adapter = new PrismaPg(pool)

        const prismaClient = extendedPrismaClient({
            adapter,
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
