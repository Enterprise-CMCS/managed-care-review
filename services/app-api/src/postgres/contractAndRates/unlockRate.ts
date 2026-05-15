import type { RateType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { findRateWithHistory } from './findRateWithHistory'
import {
    lockRateRowForUpdate,
    runTransactionWithRowLock,
} from '../prismaHelpers'

type UnlockRateArgsType = {
    rateID: string
    unlockedByUserID: string
    unlockReason: string
}

async function unlockRateInDB(
    tx: PrismaTransactionType,
    rateID: string,
    unlockInfoID: string,
    // Used to override createdAt timestamp when calling multiple prisma functions within the same transaction that need
    // sequential timestamps for revision history.
    manualCreatedAt?: Date
): Promise<string | Error> {
    const currentDateTime = new Date()
    // find the current rate revision in order to create a new unlocked revision
    const currentRev = await tx.rateRevisionTable.findFirst({
        where: {
            rateID,
            undoUnlockInfoID: null,
        },
        include: {
            rateDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            supportingDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            certifyingActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
            },
            addtlActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
            },
            contractsWithSharedRateRevision: true,
            relatedSubmissions: {
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
                include: {
                    submissionPackages: {
                        include: {
                            contractRevision: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    })
    if (!currentRev) {
        console.error(
            'Programming Error: cannot find the current revision to submit'
        )
        return new Error(
            'Programming Error: cannot find the current revision to submit'
        )
    }

    if (!currentRev.submitInfoID) {
        console.error(
            'Programming Error: cannot unlock a already unlocked rate'
        )
        return new Error(
            'Programming Error: cannot unlock a already unlocked rate'
        )
    }
    const prevContractsWithSharedRateRevisionIDs =
        currentRev.contractsWithSharedRateRevision.map(
            (contract) => contract.id
        )

    await tx.rateRevisionTable.create({
        data: {
            createdAt: manualCreatedAt ?? currentDateTime,
            rate: {
                connect: {
                    id: currentRev.rateID,
                },
            },
            unlockInfo: {
                connect: { id: unlockInfoID },
            },
            rateType: currentRev.rateType,
            rateCapitationType: currentRev.rateCapitationType,
            rateDateStart: currentRev.rateDateStart,
            rateDateEnd: currentRev.rateDateEnd,
            rateDateCertified: currentRev.rateDateCertified,
            amendmentEffectiveDateEnd: currentRev.amendmentEffectiveDateEnd,
            amendmentEffectiveDateStart: currentRev.amendmentEffectiveDateStart,
            rateProgramIDs: currentRev.rateProgramIDs,
            deprecatedRateProgramIDs: currentRev.deprecatedRateProgramIDs,
            rateCertificationName: currentRev.rateCertificationName,
            actuaryCommunicationPreference:
                currentRev.actuaryCommunicationPreference,
            rateMedicaidPopulations: currentRev.rateMedicaidPopulations,

            rateDocuments: {
                create: currentRev.rateDocuments.map((d) => ({
                    position: d.position,
                    name: d.name,
                    s3URL: d.s3URL,
                    sha256: d.sha256,
                    s3BucketName: d.s3BucketName,
                    s3Key: d.s3Key,
                })),
            },
            supportingDocuments: {
                create: currentRev.supportingDocuments.map((d) => ({
                    position: d.position,
                    name: d.name,
                    s3URL: d.s3URL,
                    sha256: d.sha256,
                    s3BucketName: d.s3BucketName,
                    s3Key: d.s3Key,
                })),
            },
            certifyingActuaryContacts: {
                create: currentRev.certifyingActuaryContacts.map((c) => ({
                    position: c.position,
                    name: c.name,
                    email: c.email,
                    titleRole: c.titleRole,
                    actuarialFirm: c.actuarialFirm,
                    actuarialFirmOther: c.actuarialFirmOther,
                })),
            },
            addtlActuaryContacts: {
                create: currentRev.addtlActuaryContacts.map((c) => ({
                    position: c.position,
                    name: c.name,
                    email: c.email,
                    titleRole: c.titleRole,
                    actuarialFirm: c.actuarialFirm,
                    actuarialFirmOther: c.actuarialFirmOther,
                })),
            },
            contractsWithSharedRateRevision: {
                connect: prevContractsWithSharedRateRevisionIDs.map(
                    (contractID) => ({
                        id: contractID,
                    })
                ),
            },
        },
    })

    // Unlock rate will only ever by run after the linked rates FF is enabled
    // we only need to set draft rates explicitly in that case, when doing a rate
    // unlock UNDER a contract unlock, the contract will set the draft rates correctly.
    // add DraftContract connections to the Rate
    const lastSubmission = currentRev.relatedSubmissions[0]
    const submissionConnections = lastSubmission.submissionPackages.filter(
        (p) => p.rateRevisionID === currentRev.id
    )
    const newDraftConnections = []
    for (const submissionConnection of submissionConnections) {
        newDraftConnections.push({
            contractID: submissionConnection.contractRevision.contractID,
            rateID: currentRev.rateID,
            ratePosition: submissionConnection.ratePosition,
        })
    }
    await tx.draftRateJoinTable.createMany({
        data: newDraftConnections,
        skipDuplicates: true,
    })

    return currentRev.id
}

// Unlock the given rate
// * copy form data
// * set relationships based on last submission
async function unlockRate(
    client: ExtendedPrismaClient,
    args: UnlockRateArgsType
): Promise<RateType | Error> {
    const { rateID, unlockedByUserID, unlockReason } = args

    return runTransactionWithRowLock({
        client,
        operationName: 'unlockRate',
        lock: async (tx) => await lockRateRowForUpdate(tx, rateID),
        transaction: async (tx) => {
            const currentDateTime = new Date()
            // create the unlock info for unlockRateInDB. unlockRateInDB is used
            // in other store functions so it cannot be done inside of it.
            const unlockInfo = await tx.updateInfoTable.create({
                data: {
                    updatedAt: currentDateTime,
                    updatedByID: unlockedByUserID,
                    updatedReason: unlockReason,
                },
            })

            const submittedID = await unlockRateInDB(tx, rateID, unlockInfo.id)

            if (submittedID instanceof Error) {
                throw submittedID
            }

            return findRateWithHistory(tx, rateID)
        },
    })
}

export { unlockRate, unlockRateInDB }
export type { UnlockRateArgsType }
