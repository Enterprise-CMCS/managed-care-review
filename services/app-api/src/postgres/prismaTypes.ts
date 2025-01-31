import type { ExtendedPrismaClient } from './prismaClient'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    ExtendedPrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export type { PrismaTransactionType }
