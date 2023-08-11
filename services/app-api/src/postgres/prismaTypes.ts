import type { PrismaClient } from '@prisma/client'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>

export type { PrismaTransactionType }
