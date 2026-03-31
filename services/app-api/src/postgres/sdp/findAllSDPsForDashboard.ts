import { Prisma } from '../../generated/client'
import type { ExtendedPrismaClient } from '../prismaClient'

type FindAllSDPsForDashboardArgs = {
    stateCode?: string
    includeDrafts?: boolean
}

type SDPDashboardRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    status: string
    stateCode: string
    stateName: string
    stateNumber: number
    submissionType: string
    programIDs: string[]
}

async function findAllSDPsForDashboard(
    client: ExtendedPrismaClient,
    args?: FindAllSDPsForDashboardArgs
): Promise<SDPDashboardRow[] | Error> {
    try {
        const includeDrafts = args?.includeDrafts ?? false

        const rows = await client.$queryRaw<SDPDashboardRow[]>(
            Prisma.sql`
                SELECT
                    sdp."id",
                    sdp."createdAt",
                    sdp."updatedAt",
                    sdp."status",
                    sdp."stateCode",
                    state."name" AS "stateName",
                    sdp."stateNumber",
                    revision."submissionType"::text AS "submissionType",
                    revision."programIDs"
                FROM "SDPTable" sdp
                INNER JOIN "State" state
                    ON state."stateCode" = sdp."stateCode"
                INNER JOIN LATERAL (
                    SELECT
                        "submissionType",
                        "programIDs"
                    FROM "SDPRevisionTable"
                    WHERE "sdpID" = sdp."id"
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                ) revision ON TRUE
                WHERE (${args?.stateCode ?? null}::text IS NULL OR sdp."stateCode" = ${args?.stateCode ?? null})
                  AND (${includeDrafts}::boolean = TRUE OR sdp."status" <> 'DRAFT')
                ORDER BY sdp."updatedAt" DESC
            `
        )

        return rows
    } catch (err) {
        console.error('PRISMA ERROR: Error finding all SDPs for dashboard', err)
        return err as Error
    }
}

export { findAllSDPsForDashboard }
export type { FindAllSDPsForDashboardArgs, SDPDashboardRow }
