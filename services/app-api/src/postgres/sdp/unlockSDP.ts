import { randomUUID } from 'crypto'
import { Prisma } from '../../generated/client'
import type { ExtendedPrismaClient } from '../prismaClient'
import type {
    SDPChangeType,
    SDPSubmissionType,
    SDPType,
    UnlockSDPInputType,
} from '../../domain-models'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import { findSDPWithHistory } from './findSDPWithHistory'

type UnlockSDPArgsType = UnlockSDPInputType

type ExistingSDPRow = {
    id: string
    status: string
}

type ExistingSDPRevisionRow = {
    id: string
    submissionType: SDPSubmissionType
    programIDs: string[]
    changesIncluded: SDPChangeType[]
    ratingPeriodStart: Date
    ratingPeriodEnd: Date
    estimatedFederalShare: string | null
    estimatedStateShare: string | null
    automaticallyRenewed: boolean
}

type ExistingSDPDocumentRow = {
    position: number
    name: string
    s3URL: string
    s3BucketName: string | null
    s3Key: string | null
    sha256: string
    dateAdded: Date | null
}

type ExistingSDPStateContactRow = {
    position: number
    name: string | null
    titleRole: string | null
    email: string | null
}

const parsePgArray = (
    value: string[] | string | null | undefined
): string[] => {
    if (!value) {
        return []
    }

    if (Array.isArray(value)) {
        return value
    }

    const trimmed = value.trim()

    if (trimmed === '{}' || trimmed === '') {
        return []
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return trimmed
            .slice(1, -1)
            .split(',')
            .map((item) => item.replace(/^"(.*)"$/, '$1'))
            .filter(Boolean)
    }

    return [trimmed]
}

async function unlockSDP(
    client: ExtendedPrismaClient,
    args: UnlockSDPArgsType
): Promise<SDPType | Error> {
    try {
        const unlockResult = await client.$transaction(async (tx) => {
            const sdpRows = await tx.$queryRaw<ExistingSDPRow[]>(
                Prisma.sql`
                    SELECT "id", "status"
                    FROM "SDPTable"
                    WHERE "id" = ${args.sdpID}
                `
            )
            const sdp = sdpRows[0]

            if (!sdp) {
                return new NotFoundError(
                    `Cannot find SDP to unlock with id: ${args.sdpID}`
                )
            }

            if (!['SUBMITTED', 'RESUBMITTED'].includes(sdp.status)) {
                return new UserInputPostgresError(
                    `Attempted to unlock SDP with invalid status: ${sdp.status}`
                )
            }

            const latestRevisionRows = await tx.$queryRaw<
                ExistingSDPRevisionRow[]
            >(
                Prisma.sql`
                    SELECT
                        "id",
                        "submissionType",
                        "programIDs",
                        "changesIncluded",
                        "ratingPeriodStart",
                        "ratingPeriodEnd",
                        "estimatedFederalShare",
                        "estimatedStateShare",
                        "automaticallyRenewed"
                    FROM "SDPRevisionTable"
                    WHERE "sdpID" = ${args.sdpID}
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                `
            )
            const latestRevision = latestRevisionRows[0]

            if (!latestRevision) {
                return new NotFoundError(
                    `Cannot find submitted SDP revision to unlock with SDP id: ${args.sdpID}`
                )
            }

            const [documents, stateContacts] = await Promise.all([
                tx.$queryRaw<ExistingSDPDocumentRow[]>(
                    Prisma.sql`
                        SELECT
                            "position",
                            "name",
                            "s3URL",
                            "s3BucketName",
                            "s3Key",
                            "sha256",
                            "dateAdded"
                        FROM "SDPDocument"
                        WHERE "sdpRevisionID" = ${latestRevision.id}
                        ORDER BY "position" ASC, "createdAt" ASC
                    `
                ),
                tx.$queryRaw<ExistingSDPStateContactRow[]>(
                    Prisma.sql`
                        SELECT
                            "position",
                            "name",
                            "titleRole",
                            "email"
                        FROM "SDPStateContact"
                        WHERE "sdpRevisionID" = ${latestRevision.id}
                        ORDER BY "position" ASC, "createdAt" ASC
                    `
                ),
            ])

            const unlockInfo = await tx.updateInfoTable.create({
                data: {
                    updatedAt: new Date(),
                    updatedByID: args.unlockedByUserID,
                    updatedReason: args.unlockReason,
                },
            })

            const unlockedRevisionID = randomUUID()
            const programIDs = parsePgArray(
                latestRevision.programIDs as string[] | string
            )
            const changesIncluded = parsePgArray(
                latestRevision.changesIncluded as SDPChangeType[] | string
            ) as SDPChangeType[]

            await tx.$executeRaw(
                Prisma.sql`
                    INSERT INTO "SDPRevisionTable" (
                        "id",
                        "sdpID",
                        "unlockInfoID",
                        "submissionType",
                        "programIDs",
                        "changesIncluded",
                        "ratingPeriodStart",
                        "ratingPeriodEnd",
                        "estimatedFederalShare",
                        "estimatedStateShare",
                        "automaticallyRenewed"
                    )
                    VALUES (
                        ${unlockedRevisionID},
                        ${args.sdpID},
                        ${unlockInfo.id},
                        ${latestRevision.submissionType}::"SDPSubmissionType",
                        ARRAY[${Prisma.join(programIDs)}]::text[],
                        ARRAY[${Prisma.join(changesIncluded)}]::"SDPChangeType"[],
                        ${latestRevision.ratingPeriodStart}::date,
                        ${latestRevision.ratingPeriodEnd}::date,
                        ${latestRevision.estimatedFederalShare ?? null},
                        ${latestRevision.estimatedStateShare ?? null},
                        ${latestRevision.automaticallyRenewed}
                    )
                `
            )

            for (const document of documents) {
                await tx.$executeRaw(
                    Prisma.sql`
                        INSERT INTO "SDPDocument" (
                            "id",
                            "position",
                            "name",
                            "s3URL",
                            "s3BucketName",
                            "s3Key",
                            "sha256",
                            "dateAdded",
                            "sdpRevisionID"
                        )
                        VALUES (
                            ${randomUUID()},
                            ${document.position},
                            ${document.name},
                            ${document.s3URL},
                            ${document.s3BucketName},
                            ${document.s3Key},
                            ${document.sha256},
                            ${document.dateAdded},
                            ${unlockedRevisionID}
                        )
                    `
                )
            }

            for (const contact of stateContacts) {
                await tx.$executeRaw(
                    Prisma.sql`
                        INSERT INTO "SDPStateContact" (
                            "id",
                            "position",
                            "name",
                            "titleRole",
                            "email",
                            "sdpRevisionID"
                        )
                        VALUES (
                            ${randomUUID()},
                            ${contact.position},
                            ${contact.name},
                            ${contact.titleRole},
                            ${contact.email},
                            ${unlockedRevisionID}
                        )
                    `
                )
            }

            await tx.$executeRaw(
                Prisma.sql`
                    UPDATE "SDPTable"
                    SET
                        "status" = 'UNLOCKED',
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "id" = ${args.sdpID}
                `
            )

            return args.sdpID
        })

        if (unlockResult instanceof Error) {
            return unlockResult
        }

        return await findSDPWithHistory(client, unlockResult)
    } catch (err) {
        console.error('Prisma error unlocking SDP', err)
        return err as Error
    }
}

export { unlockSDP }
export type { UnlockSDPArgsType }
