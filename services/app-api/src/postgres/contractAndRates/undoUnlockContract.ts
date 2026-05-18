import { findContractWithHistory } from './findContractWithHistory'
import { type NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { ContractType } from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'
import { Prisma } from '../../generated/client'
import {
    getLatestActiveRevision,
    isSubmittedRevision,
    isUnlockedRevision,
} from './prismaSharedContractRateHelpers'

const MAX_SERIALIZATION_RETRIES = 2

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

    const unlockedRateRevisionIDs = unlockedRates.flatMap((rate) => {
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
            return [latestRevision.id]
        }

        return []
    })

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
    let attempt = 0
    while (true) {
        try {
            return await client.$transaction(
                async (tx) => {
                    const result = await undoUnlockContractInsideTransaction(
                        tx,
                        args
                    )
                    if (result instanceof Error) {
                        throw result
                    }
                    return result
                },
                {
                    isolationLevel:
                        Prisma.TransactionIsolationLevel.Serializable,
                }
            )
        } catch (err) {
            const code = (err as { code?: string }).code
            const cause = (err as { cause?: { kind?: string } }).cause
            const isWriteConflict =
                code === 'P2034' || cause?.kind === 'TransactionWriteConflict'

            if (isWriteConflict && attempt < MAX_SERIALIZATION_RETRIES - 1) {
                console.warn(
                    `undoUnlockContract: serialization conflict, retrying. contractID=${args.contractID} attempt=${attempt + 1}`
                )
                attempt++
                continue
            }

            console.error('Prisma error undoing contract unlock', err)
            return parseErrorToError(err)
        }
    }
}

export { undoUnlockContract, undoUnlockContractInsideTransaction }
export type { UndoUnlockContractArgsType }
