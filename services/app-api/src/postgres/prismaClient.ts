import { PrismaClient } from '@prisma/client'

const errorMessages = {
    delete: 'Deletion of records is not allowed',
    create: 'Creation of new records is not allowed',
}

/**
 * Creates an extended instance of the PrismaClient with custom behavior for certain operations.
 *
 * This function extends the PrismaClient to throw errors when attempting to perform
 * create or delete operations on the `applicationSettings` and `emailSettings` models.
 *
 * @returns {PrismaClient} An extended instance of the PrismaClient with the custom behavior.
 */
function extendedPrismaClient() {
    return new PrismaClient().$extends({
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
        const prismaClient = extendedPrismaClient()

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
