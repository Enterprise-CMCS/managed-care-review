import { findContractWithHistory } from './findContractWithHistory'
import { UserInputPostgresError } from '../postgresErrors'
import type { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    getLatestActiveRevision,
    isSubmittedRevision,
    isUnlockedRevision,
} from './prismaSharedContractRateHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'

async function undoUnlockContractInsideTransaction(
    tx: PrismaTransactionType,
    args: UndoUnlockContractArgsType
): Promise<ContractType | Error> {
    const { contractID, updatedByID, updatedReason } = args

    const currentRevision = await tx.contractRevisionTable.findFirst({
        where: {
            contractID,
            submitInfoID: null,
            undoUnlockInfoID: null,
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            unlockInfoID: true,
            submitInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                },
            },
            unlockInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                },
            },
            undoUnlockInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                },
            },
        },
    })

    if (!currentRevision) {
        return new UserInputPostgresError(
            `Cannot undo unlock: contract ${contractID} is no longer in an unlocked state`
        )
    }

    if (!isUnlockedRevision(currentRevision)) {
        return new UserInputPostgresError(
            'Cannot undo unlock: latest contract revision is not an unlocked draft revision'
        )
    }

    const sharedUnlockInfoID = currentRevision.unlockInfoID
    const undoUnlockInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: new Date(),
            updatedByID,
            updatedReason,
        },
    })

    const unlockedRates = await tx.rateTable.findMany({
        where: {
            revisions: {
                some: {
                    unlockInfoID: sharedUnlockInfoID,
                    submitInfoID: null,
                    undoUnlockInfoID: null,
                },
            },
        },
        select: {
            id: true,
            revisions: {
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    id: true,
                    createdAt: true,
                    submitInfoID: true,
                    unlockInfoID: true,
                    undoUnlockInfoID: true,
                    submitInfo: {
                        select: {
                            id: true,
                            updatedAt: true,
                            updatedReason: true,
                            submittedContracts: {
                                select: {
                                    contractID: true,
                                },
                            },
                        },
                    },
                    unlockInfo: {
                        select: {
                            id: true,
                            updatedAt: true,
                            updatedReason: true,
                        },
                    },
                    undoUnlockInfo: {
                        select: {
                            id: true,
                            updatedAt: true,
                            updatedReason: true,
                        },
                    },
                },
            },
        },
    })

    const unlockedRateRevisionIDs: string[] = []
    const childRateIDs: string[] = []

    for (const rate of unlockedRates) {
        const latestRevision = getLatestActiveRevision(rate.revisions)
        // We need the latest submitted revision across the full history, not just
        // the latest couple of rows. After unlock -> undo unlock -> unlock
        // again, the top two rows are both unlocked variants.
        const latestSubmittedRevision = rate.revisions.find(isSubmittedRevision)
        const latestSubmittedParentContractID =
            latestSubmittedRevision?.submitInfo?.submittedContracts[0]
                ?.contractID

        if (
            latestRevision &&
            isUnlockedRevision(latestRevision) &&
            latestRevision.unlockInfoID === sharedUnlockInfoID &&
            latestSubmittedParentContractID === contractID
        ) {
            unlockedRateRevisionIDs.push(latestRevision.id)
            childRateIDs.push(rate.id)
        }
    }

    if (unlockedRateRevisionIDs.length > 0) {
        await tx.rateRevisionTable.updateMany({
            where: {
                id: {
                    in: unlockedRateRevisionIDs,
                },
            },
            data: {
                undoUnlockInfoID: undoUnlockInfo.id,
            },
        })
    }

    await tx.contractRevisionTable.update({
        where: {
            id: currentRevision.id,
        },
        data: {
            undoUnlockInfoID: undoUnlockInfo.id,
        },
    })

    // Undo unlock is a visible status/action change for users. Keep stored
    // freshness on the contract and reversed child rates aligned with the
    // undoUnlockInfo event timestamp. Linked rates are intentionally excluded:
    // their own revisions were not reversed by this contract action.
    await tx.contractTable.update({
        where: {
            id: contractID,
        },
        data: {
            lastActionDate: undoUnlockInfo.updatedAt,
        },
    })

    if (childRateIDs.length > 0) {
        await tx.rateTable.updateMany({
            where: {
                id: {
                    in: childRateIDs,
                },
            },
            data: {
                lastActionDate: undoUnlockInfo.updatedAt,
            },
        })
    }

    await tx.draftRateJoinTable.deleteMany({
        where: {
            contractID,
        },
    })

    return findContractWithHistory(tx, contractID)
}

type UndoUnlockContractArgsType = {
    contractID: string
    updatedByID: string
    updatedReason: string
}

async function undoUnlockContract(
    client: ExtendedPrismaClient,
    args: UndoUnlockContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    return runTransactionWithRowLock({
        client,
        operationName: 'undoUnlockContract',
        table: 'ContractTable',
        id: args.contractID,
        transaction: async (tx) =>
            await undoUnlockContractInsideTransaction(tx, args),
    })
}

export { undoUnlockContract, undoUnlockContractInsideTransaction }
export type { UndoUnlockContractArgsType }
