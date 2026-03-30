import { Prisma } from '../../generated/client'
import type { SDPType, CreateSDPInputType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'

type InsertSDPArgsType = CreateSDPInputType
type InsertedSDPRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    mccrsID: string | null
    stateCode: string
    stateNumber: number
}

type InsertedSDPRevisionRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    submissionType: InsertSDPArgsType['submissionType']
    programIDs: string[]
    changesIncluded: InsertSDPArgsType['changesIncluded']
    ratingPeriodStart: Date
    ratingPeriodEnd: Date
    estimatedFederalShare: string | null
    estimatedStateShare: string | null
    automaticallyRenewed: boolean
}

async function insertDraftSDP(
    client: ExtendedPrismaClient,
    args: InsertSDPArgsType
): Promise<SDPType | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const { latestStateSubmissionNumber } = await tx.state.update({
                data: {
                    latestStateSubmissionNumber: {
                        increment: 1,
                    },
                },
                where: {
                    stateCode: args.stateCode,
                },
            })

            // Use raw SQL until the checked-in Prisma client is regenerated with
            // SDP delegates. This keeps createSDP able to persist records now.
            const insertedSDPRows = await tx.$queryRaw<InsertedSDPRow[]>(
                Prisma.sql`
                    INSERT INTO "SDPTable" ("stateCode", "stateNumber")
                    VALUES (${args.stateCode}, ${latestStateSubmissionNumber})
                    RETURNING "id", "createdAt", "updatedAt", "mccrsID", "stateCode", "stateNumber"
                `
            )
            const sdp = insertedSDPRows[0]

            if (!sdp) {
                throw new Error('Unexpected error: failed to insert SDP row')
            }

            const insertedRevisionRows = await tx.$queryRaw<
                InsertedSDPRevisionRow[]
            >(
                Prisma.sql`
                        INSERT INTO "SDPRevisionTable" (
                            "sdpID",
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
                            ${sdp.id},
                            ${args.submissionType}::"SDPSubmissionType",
                            ARRAY[${Prisma.join(args.programIDs)}]::text[],
                            ARRAY[${Prisma.join(args.changesIncluded)}]::"SDPChangeType"[],
                            ${args.ratingPeriodStart}::date,
                            ${args.ratingPeriodEnd}::date,
                            ${args.estimatedFederalShare ?? null},
                            ${args.estimatedStateShare ?? null},
                            ${args.automaticallyRenewed}
                        )
                        RETURNING
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
                    `
            )
            const draftRevision = insertedRevisionRows[0]

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: failed to insert SDP revision row'
                )
            }

            return {
                id: sdp.id,
                createdAt: sdp.createdAt,
                updatedAt: sdp.updatedAt,
                stateCode: sdp.stateCode,
                mccrsID: sdp.mccrsID ?? undefined,
                stateNumber: sdp.stateNumber,
                draftRevision: {
                    id: draftRevision.id,
                    sdp: {
                        id: sdp.id,
                        stateCode: sdp.stateCode,
                        stateNumber: sdp.stateNumber,
                    },
                    createdAt: draftRevision.createdAt,
                    updatedAt: draftRevision.updatedAt,
                    formData: {
                        submissionType: draftRevision.submissionType,
                        programIDs: draftRevision.programIDs,
                        changesIncluded: draftRevision.changesIncluded,
                        ratingPeriodStart: draftRevision.ratingPeriodStart,
                        ratingPeriodEnd: draftRevision.ratingPeriodEnd,
                        estimatedFederalShare:
                            draftRevision.estimatedFederalShare ?? undefined,
                        estimatedStateShare:
                            draftRevision.estimatedStateShare ?? undefined,
                        automaticallyRenewed:
                            draftRevision.automaticallyRenewed,
                    },
                },
                revisions: [draftRevision].map((revision) => ({
                    id: revision.id,
                    sdp: {
                        id: sdp.id,
                        stateCode: sdp.stateCode,
                        stateNumber: sdp.stateNumber,
                    },
                    createdAt: revision.createdAt,
                    updatedAt: revision.updatedAt,
                    formData: {
                        submissionType: revision.submissionType,
                        programIDs: revision.programIDs,
                        changesIncluded: revision.changesIncluded,
                        ratingPeriodStart: revision.ratingPeriodStart,
                        ratingPeriodEnd: revision.ratingPeriodEnd,
                        estimatedFederalShare:
                            revision.estimatedFederalShare ?? undefined,
                        estimatedStateShare:
                            revision.estimatedStateShare ?? undefined,
                        automaticallyRenewed: revision.automaticallyRenewed,
                    },
                })),
                questions: undefined,
            }
        })
    } catch (err) {
        console.error('Prisma error inserting SDP', err)
        return err as Error
    }
}

export { insertDraftSDP }
export type { InsertSDPArgsType }
