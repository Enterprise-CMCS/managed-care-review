import { randomUUID } from 'crypto'
import { Prisma } from '../../generated/client'
import type {
    SDPType,
    SDPDocumentInputType,
    SDPSubmissionType,
    SDPChangeType,
    UpdateSDPInputType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'

type UpdateSDPArgsType = UpdateSDPInputType

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

async function insertSDPDocuments(
    tx: PrismaTransactionType,
    sdpRevisionID: string,
    sdpDocuments: SDPDocumentInputType[]
): Promise<void> {
    for (const [index, document] of sdpDocuments.entries()) {
        await tx.$executeRaw(
            Prisma.sql`
                INSERT INTO "SDPDocument" (
                    "id",
                    "name",
                    "s3URL",
                    "s3BucketName",
                    "s3Key",
                    "sha256",
                    "dateAdded",
                    "position",
                    "sdpRevisionID"
                )
                VALUES (
                    ${randomUUID()},
                    ${document.name},
                    ${document.s3URL},
                    ${document.s3BucketName ?? null},
                    ${document.s3Key ?? null},
                    ${document.sha256},
                    ${document.dateAdded ?? null},
                    ${index},
                    ${sdpRevisionID}
                )
            `
        )
    }
}

async function insertSDPStateContacts(
    tx: PrismaTransactionType,
    sdpRevisionID: string,
    stateContacts: UpdateSDPInputType['stateContacts']
): Promise<void> {
    for (const [index, contact] of stateContacts.entries()) {
        await tx.$executeRaw(
            Prisma.sql`
                INSERT INTO "SDPStateContact" (
                    "id",
                    "name",
                    "titleRole",
                    "email",
                    "position",
                    "sdpRevisionID"
                )
                VALUES (
                    ${randomUUID()},
                    ${contact.name ?? null},
                    ${contact.titleRole ?? null},
                    ${contact.email ?? null},
                    ${index},
                    ${sdpRevisionID}
                )
            `
        )
    }
}

async function updateDraftSDP(
    client: ExtendedPrismaClient,
    args: UpdateSDPArgsType
): Promise<SDPType | Error> {
    try {
        return await client.$transaction(async (tx) => {
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
                    `Cannot find SDP to update with id: ${args.sdpID}`
                )
            }

            if (sdp.status !== 'DRAFT') {
                return new UserInputPostgresError(
                    `SDP is not in editable state. SDP: ${args.sdpID} Status: ${sdp.status}`
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
                    `Cannot find draft SDP revision to update with SDP id: ${args.sdpID}`
                )
            }

            if (
                currentRevision.updatedAt.getTime() !==
                args.lastSeenUpdatedAt.getTime()
            ) {
                return new UserInputPostgresError(
                    'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'
                )
            }

            const updatedRevisionRows = await tx.$queryRaw<
                ExistingSDPRevisionRow[]
            >(
                Prisma.sql`
                        UPDATE "SDPRevisionTable"
                        SET "updatedAt" = CURRENT_TIMESTAMP
                        WHERE "id" = ${currentRevision.id}
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
            const updatedRevision = updatedRevisionRows[0]

            if (!updatedRevision) {
                return new Error(
                    `Unexpected error updating SDP revision for SDP id: ${args.sdpID}`
                )
            }

            const updatedSDPRows = await tx.$queryRaw<ExistingSDPRow[]>(
                Prisma.sql`
                    UPDATE "SDPTable"
                    SET "updatedAt" = CURRENT_TIMESTAMP
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
            const updatedSDP = updatedSDPRows[0]

            if (!updatedSDP) {
                return new Error(
                    `Unexpected error updating SDP for id: ${args.sdpID}`
                )
            }

            await tx.$executeRaw(
                Prisma.sql`
                    DELETE FROM "SDPDocument"
                    WHERE "sdpRevisionID" = ${currentRevision.id}
                `
            )
            await insertSDPDocuments(tx, currentRevision.id, args.sdpDocuments)
            await tx.$executeRaw(
                Prisma.sql`
                    DELETE FROM "SDPStateContact"
                    WHERE "sdpRevisionID" = ${currentRevision.id}
                `
            )
            await insertSDPStateContacts(
                tx,
                currentRevision.id,
                args.stateContacts
            )

            await tx.$executeRaw(
                Prisma.sql`
                    DELETE FROM "ContractSDPJoinTable"
                    WHERE "sdpID" = ${args.sdpID}
                `
            )

            for (const contractID of args.relatedContractIDs) {
                await tx.$executeRaw(
                    Prisma.sql`
                        INSERT INTO "ContractSDPJoinTable" ("contractID", "sdpID")
                        VALUES (${contractID}, ${args.sdpID})
                        ON CONFLICT ("contractID", "sdpID") DO NOTHING
                    `
                )
            }

            return {
                id: updatedSDP.id,
                createdAt: updatedSDP.createdAt,
                updatedAt: updatedSDP.updatedAt,
                status: updatedSDP.status as SDPType['status'],
                stateCode: updatedSDP.stateCode,
                mccrsID: updatedSDP.mccrsID ?? undefined,
                stateNumber: updatedSDP.stateNumber,
                draftRevision: {
                    id: updatedRevision.id,
                    sdpID: updatedSDP.id,
                    sdp: {
                        id: updatedSDP.id,
                        stateCode: updatedSDP.stateCode,
                        stateNumber: updatedSDP.stateNumber,
                    },
                    createdAt: updatedRevision.createdAt,
                    updatedAt: updatedRevision.updatedAt,
                    formData: {
                        submissionType: updatedRevision.submissionType,
                        programIDs: updatedRevision.programIDs,
                        changesIncluded: updatedRevision.changesIncluded,
                        ratingPeriodStart: updatedRevision.ratingPeriodStart,
                        ratingPeriodEnd: updatedRevision.ratingPeriodEnd,
                        estimatedFederalShare:
                            updatedRevision.estimatedFederalShare ?? undefined,
                        estimatedStateShare:
                            updatedRevision.estimatedStateShare ?? undefined,
                        automaticallyRenewed:
                            updatedRevision.automaticallyRenewed,
                        stateContacts: args.stateContacts,
                    },
                    sdpDocuments: [],
                },
                latestSubmittedRevision: undefined,
                revisions: [
                    {
                        id: updatedRevision.id,
                        sdpID: updatedSDP.id,
                        sdp: {
                            id: updatedSDP.id,
                            stateCode: updatedSDP.stateCode,
                            stateNumber: updatedSDP.stateNumber,
                        },
                        createdAt: updatedRevision.createdAt,
                        updatedAt: updatedRevision.updatedAt,
                        formData: {
                            submissionType: updatedRevision.submissionType,
                            programIDs: updatedRevision.programIDs,
                            changesIncluded: updatedRevision.changesIncluded,
                            ratingPeriodStart:
                                updatedRevision.ratingPeriodStart,
                            ratingPeriodEnd: updatedRevision.ratingPeriodEnd,
                            estimatedFederalShare:
                                updatedRevision.estimatedFederalShare ??
                                undefined,
                            estimatedStateShare:
                                updatedRevision.estimatedStateShare ??
                                undefined,
                            automaticallyRenewed:
                                updatedRevision.automaticallyRenewed,
                            stateContacts: args.stateContacts,
                        },
                        sdpDocuments: [],
                    },
                ],
                questions: undefined,
            }
        })
    } catch (err) {
        console.error('Prisma error updating SDP', err)
        return err as Error
    }
}

export { updateDraftSDP }
export type { UpdateSDPArgsType }
