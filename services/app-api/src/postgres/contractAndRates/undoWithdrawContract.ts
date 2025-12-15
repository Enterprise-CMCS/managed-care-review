import type { ContractType } from '../../domain-models'
import type { RateForDisplayType } from '../../emailer/templateHelpers'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { unlockContractInsideTransaction } from './unlockContract'
import { submitContractInsideTransaction } from './submitContract'
import { findContractWithHistory } from './findContractWithHistory'

export type UndoWithdrawContractArgsType = {
    contract: ContractType
    updatedByID: string
    updatedReason: string
}

export type UndoWithdrawContractReturnType = {
    contract: ContractType
    ratesForDisplay: RateForDisplayType[]
}

/**
 * Undo a withdrawn contract and rates withdrawn along with it.
 *
 * This function performs the following operations:
 * 1. Validates the contract is currently withdrawn
 * 2. Unlock contract with child rates with default undo withdrawal reason and append inputted withdraw reason
 * 3. Resubmits contract with child rate with default undo withdrawal reason and append inputted withdraw reason
 * 4. Creates a new UNDER_REVIEW action for contract and child rates
 * 5. Resubmits the contract and child rates with a withdrawal reason
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param {UndoWithdrawContractArgsType} args - Undo withdrawal arguments
 * @param {ContractType} args.contract - The contract to undo withdrawal
 * @param {string} args.updatedReason - The reason for undoing withdrawal
 * @param {string} args.updatedByID - ID of the user performing undo withdrawal
 *
 */
const undoWithdrawContractInsideTransaction = async (
    tx: PrismaTransactionType,
    args: UndoWithdrawContractArgsType
): Promise<UndoWithdrawContractReturnType> => {
    const { contract, updatedReason, updatedByID } = args

    // Check contract review status again
    const contractReviewStatus = await tx.contractTable.findUnique({
        where: {
            id: contract.id,
        },
        select: {
            reviewStatusActions: {
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
                select: {
                    actionType: true,
                },
            },
        },
    })

    if (!contractReviewStatus) {
        throw new Error(
            'Could not find contract to validate review status is WITHDRAW.'
        )
    }

    if (contractReviewStatus.reviewStatusActions[0].actionType !== 'WITHDRAW') {
        throw new Error(
            'Contract to undo withdrawal is not currently withdrawn.'
        )
    }

    // Unlock contract and child rates
    const unlockedContract = await unlockContractInsideTransaction(tx, {
        contractID: contract.id,
        unlockedByUserID: updatedByID,
        unlockReason: `CMS undoing submission submission withdrawal. ${updatedReason}`,
    })

    if (unlockedContract instanceof Error) {
        throw new Error(
            `Cannot unlock contract to undo a submission withdrawal. ${unlockedContract.message}`
        )
    }

    // Go through all the draft rates and find the child rate ID's and rate cert names
    const ratesForDisplay: RateForDisplayType[] = []
    unlockedContract.draftRates.forEach((dr) => {
        if (dr.parentContractID === contract.id) {
            const rateCertificationName =
                dr.draftRevision?.formData.rateCertificationName
            ratesForDisplay.push({
                id: dr.id,
                rateCertificationName: rateCertificationName ?? 'Unknown Rate',
            })
        }
    })

    // Resubmit contact and child rates
    const resubmitContract = await submitContractInsideTransaction(tx, {
        contractID: contract.id,
        submittedByUserID: updatedByID,
        submittedReason: `CMS undid submission withdrawal. ${updatedReason}`,
    })

    if (resubmitContract instanceof Error) {
        throw new Error(
            `Cannot resubmit contract tot undo a submission withdrawal`
        )
    }

    // Add UNDER_REVIEW action to contract
    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            reviewStatusActions: {
                create: {
                    updatedByID,
                    updatedReason,
                    actionType: 'UNDER_REVIEW',
                },
            },
        },
    })

    for (const rate of ratesForDisplay) {
        // Add UNDER_REVIEW action to all rates that are withdrawn with this submission
        await tx.rateActionTable.create({
            data: {
                updatedReason,
                updatedBy: {
                    connect: {
                        id: updatedByID,
                    },
                },
                actionType: 'UNDER_REVIEW',
                rate: {
                    connect: {
                        id: rate.id,
                    },
                },
            },
        })
    }

    const undoWithdrawnContract = await findContractWithHistory(tx, contract.id)

    if (undoWithdrawnContract instanceof Error) {
        throw new Error(undoWithdrawnContract.message)
    }

    if (undoWithdrawnContract.consolidatedStatus !== 'RESUBMITTED') {
        throw new Error('Contract failed to withdraw')
    }

    return {
        contract: undoWithdrawnContract,
        ratesForDisplay: ratesForDisplay,
    }
}

const undoWithdrawContract = async (
    client: ExtendedPrismaClient,
    args: UndoWithdrawContractArgsType
): Promise<UndoWithdrawContractReturnType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await undoWithdrawContractInsideTransaction(tx, args)
        )
    } catch (err) {
        const msg = `PRISMA ERROR: Error undo withdraw contract: ${err.message}`
        console.error(msg)
        return err
    }
}

export { undoWithdrawContract }
