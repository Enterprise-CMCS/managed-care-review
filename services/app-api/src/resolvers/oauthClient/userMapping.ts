import type { Prisma } from '@prisma/client'

type PrismaUser = Prisma.UserGetPayload<{
    include: { stateAssignments?: boolean }
}>

// Helper function to map Prisma User to GraphQL UserType
export function mapPrismaUserToGraphQLUser(prismaUser: PrismaUser) {
    return {
        ...prismaUser,
        stateAssignments: prismaUser.stateAssignments || [],
    }
}
