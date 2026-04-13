import type { Prisma } from '../../generated/client'

const includeUsersWithBaseData = {
    stateAssignments: true,
} satisfies Prisma.UserInclude

type PrismaUsersWithBaseData = Prisma.UserGetPayload<{
    include: typeof includeUsersWithBaseData
}>

export { includeUsersWithBaseData }

export type { PrismaUsersWithBaseData }
