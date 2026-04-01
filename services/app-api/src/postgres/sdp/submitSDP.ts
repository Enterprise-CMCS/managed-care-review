import { Prisma } from '../../generated/client'
import type { SDPType, SubmitSDPInputType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { SDPChangeType, SDPSubmissionType } from '../../domain-models'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import { findSDPWithHistory } from './findSDPWithHistory'

type SubmitSDPArgsType = SubmitSDPInputType

type ExistingSDPRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    mccrsID: string | null
    status: string
    stateCode: string
    stateNumber: number
}

type ExistingSDPRevisionRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    submissionType: SDPSubmissionType
    programIDs: string[]
    changesIncluded: SDPChangeType[]
    ratingPeriodStart: Date
    ratingPeriodEnd: Date
    estimatedFederalShare: string | null
    estimatedStateShare: string | null
    automaticallyRenewed: boolean
}

async function submitSDP(
    client: ExtendedPrismaClient,
    args: SubmitSDPArgsType
): Promise<SDPType | Error> {
    try {
        const submitResult = await client.$transaction(async (tx) => {
            const sdpRows = await tx.$queryRaw<ExistingSDPRow[]>(
                Prisma.sql`
                    SELECT
                        "id",
                        "createdAt",
                        "updatedAt",
                        "mccrsID",
                        "status",
                        "stateCode",
                        "stateNumber"
                    FROM "SDPTable"
                    WHERE "id" = ${args.sdpID}
                      AND "stateCode" = ${args.stateCode}
                `
            )
            const sdp = sdpRows[0]

            if (!sdp) {
                return new NotFoundError(
                    `Cannot find SDP to submit with id: ${args.sdpID}`
                )
            }

            if (!['DRAFT', 'UNLOCKED'].includes(sdp.status)) {
                return new UserInputPostgresError(
                    `Attempted to submit SDP with invalid status: ${sdp.status}`
                )
            }

            const revisionRows = await tx.$queryRaw<ExistingSDPRevisionRow[]>(
                Prisma.sql`
                    SELECT
                        "id",
                        "createdAt",
                        "updatedAt",
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
            const currentRevision = revisionRows[0]

            if (!currentRevision) {
                return new NotFoundError(
                    `Cannot find SDP revision to submit with SDP id: ${args.sdpID}`
                )
            }

            if (
                currentRevision.updatedAt.getTime() !==
                args.lastSeenUpdatedAt.getTime()
            ) {
                return new UserInputPostgresError(
                    'Concurrent update error: The data you are trying to submit has changed since you last retrieved it. Please refresh the page to continue.'
                )
            }

            const submittedSDPRows = await tx.$queryRaw<ExistingSDPRow[]>(
                Prisma.sql`
                    UPDATE "SDPTable"
                    SET
                        "status" = ${
                            sdp.status === 'UNLOCKED'
                                ? 'RESUBMITTED'
                                : 'SUBMITTED'
                        }::text,
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "id" = ${args.sdpID}
                    RETURNING
                        "id",
                        "createdAt",
                        "updatedAt",
                        "mccrsID",
                        "status",
                        "stateCode",
                        "stateNumber"
                `
            )
            const submittedSDP = submittedSDPRows[0]

            if (!submittedSDP) {
                return new Error(
                    `Unexpected error submitting SDP for id: ${args.sdpID}`
                )
            }

            return submittedSDP.id
        })

        if (submitResult instanceof Error) {
            return submitResult
        }

        return await findSDPWithHistory(client, submitResult)
    } catch (err) {
        console.error('Prisma error submitting SDP', err)
        return err as Error
    }
}

export { submitSDP }
export type { SubmitSDPArgsType }
