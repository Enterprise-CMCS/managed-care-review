// Re-export everything from the generated Prisma Client
export * from '../generated/client/client'

// Re-export all model types
export type * from '../generated/client/models'

// Re-export PrismaClient as a named export for convenience
export { PrismaClient, Prisma } from '../generated/client/client'
export type { PrismaClient as PrismaClientType } from '../generated/client/client'

// Re-export error classes from Prisma namespace for convenience
import { Prisma as P } from '../generated/client/client'
export const PrismaClientKnownRequestError = P.PrismaClientKnownRequestError
export const PrismaClientUnknownRequestError = P.PrismaClientUnknownRequestError
export const PrismaClientRustPanicError = P.PrismaClientRustPanicError
export const PrismaClientInitializationError = P.PrismaClientInitializationError
export const PrismaClientValidationError = P.PrismaClientValidationError
