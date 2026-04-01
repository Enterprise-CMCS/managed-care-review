import { Prisma } from '../../generated/client'
import type { SDPType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '../postgresErrors'
import { findAllContractsStripped } from '../contractAndRates/findAllContractsStripped'

type SDPRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    mccrsID: string | null
    status: string
    stateCode: string
    stateNumber: number
}

type SDPRevisionRow = {
    id: string
    createdAt: Date
    updatedAt: Date
    submissionType:
        | 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT'
        | 'AMENDMENT_TO_AN_APPROVED_PREPRINT'
        | 'RENEWAL_FOR_NEW_RATING_PERIOD'
    programIDs: string[]
    changesIncluded: Array<
        | 'RATING_PERIOD'
        | 'PAYMENT_TYPE'
        | 'PROVIDER_TYPE'
        | 'QUALITY_METRICS_OR_BENCHMARKS'
        | 'OTHER'
    >
    ratingPeriodStart: Date
    ratingPeriodEnd: Date
    estimatedFederalShare: string | null
    estimatedStateShare: string | null
    automaticallyRenewed: boolean
}

type SDPDocumentRow = {
    id: string
    name: string
    s3URL: string
    sha256: string
    dateAdded: Date | null
    s3BucketName: string | null
    s3Key: string | null
}

type SDPStateContactRow = {
    name: string | null
    titleRole: string | null
    email: string | null
}

type SDPUnlockInfoRow = {
    updatedAt: Date
    updatedReason: string
    role: string
    email: string
    givenName: string
    familyName: string
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

async function findSDPWithHistory(
    client: ExtendedPrismaClient,
    sdpID: string
): Promise<SDPType | Error> {
    try {
        const sdpRows = await client.$queryRaw<SDPRow[]>(
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
                WHERE "id" = ${sdpID}
            `
        )
        const sdp = sdpRows[0]

        if (!sdp) {
            return new NotFoundError(`Cannot find SDP with id: ${sdpID}`)
        }

        const revisionRows = await client.$queryRaw<SDPRevisionRow[]>(
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
                WHERE "sdpID" = ${sdpID}
                ORDER BY "createdAt" DESC
            `
        )

        const revisions = await Promise.all(
            revisionRows.map(async (revision) => {
                const [documents, stateContacts, unlockInfoRows] =
                    await Promise.all([
                        client.$queryRaw<SDPDocumentRow[]>(
                            Prisma.sql`
                            SELECT
                                "id",
                                "name",
                                "s3URL",
                                "sha256",
                                "dateAdded",
                                "s3BucketName",
                                "s3Key"
                            FROM "SDPDocument"
                            WHERE "sdpRevisionID" = ${revision.id}
                            ORDER BY "position" ASC, "createdAt" ASC
                        `
                        ),
                        client.$queryRaw<SDPStateContactRow[]>(
                            Prisma.sql`
                            SELECT
                                "name",
                                "titleRole",
                                "email"
                            FROM "SDPStateContact"
                            WHERE "sdpRevisionID" = ${revision.id}
                            ORDER BY "position" ASC, "createdAt" ASC
                        `
                        ),
                        client.$queryRaw<SDPUnlockInfoRow[]>(
                            Prisma.sql`
                            SELECT
                                info."updatedAt",
                                info."updatedReason",
                                userRecord."role",
                                userRecord."email",
                                userRecord."givenName",
                                userRecord."familyName"
                            FROM "SDPRevisionTable" revisionRecord
                            INNER JOIN "UpdateInfoTable" info
                                ON info."id" = revisionRecord."unlockInfoID"
                            INNER JOIN "User" userRecord
                                ON userRecord."id" = info."updatedByID"
                            WHERE revisionRecord."id" = ${revision.id}
                        `
                        ),
                    ])
                const unlockInfo = unlockInfoRows[0]

                return {
                    id: revision.id,
                    sdpID: sdp.id,
                    sdp: {
                        id: sdp.id,
                        stateCode: sdp.stateCode,
                        stateNumber: sdp.stateNumber,
                    },
                    unlockInfo: unlockInfo
                        ? {
                              updatedAt: unlockInfo.updatedAt,
                              updatedReason: unlockInfo.updatedReason,
                              updatedBy: {
                                  role: unlockInfo.role as
                                      | 'STATE_USER'
                                      | 'CMS_USER'
                                      | 'CMS_APPROVER_USER'
                                      | 'ADMIN_USER'
                                      | 'HELPDESK_USER'
                                      | 'BUSINESSOWNER_USER',
                                  email: unlockInfo.email,
                                  givenName: unlockInfo.givenName,
                                  familyName: unlockInfo.familyName,
                              },
                          }
                        : undefined,
                    createdAt: revision.createdAt,
                    updatedAt: revision.updatedAt,
                    formData: {
                        submissionType: revision.submissionType,
                        programIDs: parsePgArray(revision.programIDs),
                        changesIncluded: parsePgArray(
                            revision.changesIncluded as string[] | string
                        ) as Array<
                            | 'RATING_PERIOD'
                            | 'PAYMENT_TYPE'
                            | 'PROVIDER_TYPE'
                            | 'QUALITY_METRICS_OR_BENCHMARKS'
                            | 'OTHER'
                        >,
                        ratingPeriodStart: revision.ratingPeriodStart,
                        ratingPeriodEnd: revision.ratingPeriodEnd,
                        estimatedFederalShare:
                            revision.estimatedFederalShare ?? undefined,
                        estimatedStateShare:
                            revision.estimatedStateShare ?? undefined,
                        automaticallyRenewed: revision.automaticallyRenewed,
                        stateContacts: stateContacts.map((contact) => ({
                            name: contact.name ?? undefined,
                            titleRole: contact.titleRole ?? undefined,
                            email: contact.email ?? undefined,
                        })),
                    },
                    sdpDocuments: documents.map((document) => ({
                        id: document.id,
                        name: document.name,
                        s3URL: document.s3URL,
                        sha256: document.sha256,
                        dateAdded: document.dateAdded ?? undefined,
                        s3BucketName: document.s3BucketName ?? undefined,
                        s3Key: document.s3Key ?? undefined,
                    })),
                }
            })
        )

        const relatedContractRows = await client.$queryRaw<
            Array<{ id: string }>
        >(
            Prisma.sql`
                SELECT
                    contract."id"
                FROM "ContractSDPJoinTable" link
                INNER JOIN "ContractTable" contract
                    ON contract."id" = link."contractID"
                WHERE link."sdpID" = ${sdpID}
                ORDER BY contract."createdAt" DESC
            `
        )
        const relatedContractsResult = await findAllContractsStripped(client, {
            contractIDs: relatedContractRows.map((contract) => contract.id),
            includeDrafts: true,
        })

        if (relatedContractsResult instanceof Error) {
            return relatedContractsResult
        }

        const relatedContracts = relatedContractsResult
            .flatMap(({ contract }) =>
                contract instanceof Error ||
                contract.contractSubmissionType === 'SDP'
                    ? []
                    : [contract]
            )
            .map((contract) => ({
                id: contract.id,
                stateCode: contract.stateCode,
                stateNumber: contract.stateNumber,
                contractSubmissionType: contract.contractSubmissionType,
                status: contract.status ?? undefined,
                reviewStatus: contract.reviewStatus ?? undefined,
                consolidatedStatus: contract.consolidatedStatus ?? undefined,
                mccrsID: contract.mccrsID ?? undefined,
            }))

        const latestRevision = revisions[0]
        const latestSubmittedRevision =
            sdp.status === 'UNLOCKED' ? revisions[1] : latestRevision

        return {
            id: sdp.id,
            createdAt: sdp.createdAt,
            updatedAt: sdp.updatedAt,
            status: sdp.status as SDPType['status'],
            stateCode: sdp.stateCode,
            mccrsID: sdp.mccrsID ?? undefined,
            stateNumber: sdp.stateNumber,
            draftRevision:
                sdp.status === 'DRAFT' || sdp.status === 'UNLOCKED'
                    ? latestRevision
                    : undefined,
            latestSubmittedRevision:
                sdp.status === 'SUBMITTED' ||
                sdp.status === 'RESUBMITTED' ||
                sdp.status === 'UNLOCKED'
                    ? latestSubmittedRevision
                    : undefined,
            revisions,
            questions: undefined,
            relatedContracts,
        }
    } catch (err) {
        console.error('Prisma error finding SDP with history', err)
        return err as Error
    }
}

export { findSDPWithHistory }
