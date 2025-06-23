import type { Prisma } from '@prisma/client'

// More flexible type that can handle users with or without stateAssignments
type PrismaUserBase = Prisma.UserGetPayload<Record<string, never>>
type PrismaUserInput = PrismaUserBase & {
    stateAssignments?: Array<{
        stateCode: string
        name: string
        latestStateSubmissionNumber: number
        latestStateRateCertNumber: number
    }>
}

// Helper function to map Prisma User to GraphQL UserType
export function mapPrismaUserToGraphQLUser(prismaUser: PrismaUserInput) {
    return {
        ...prismaUser,
        stateAssignments: prismaUser.stateAssignments || [],
    }
}
