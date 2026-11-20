import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findRateWithHistory } from './findRateWithHistory'
import { unlockRateInDB } from './unlockRate'
import { unlockContractInsideTransaction } from './unlockContract'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import type { SubmitContractArgsType } from './submitContract'
import {
    healthPlanContractReviewDeterminationAction,
    ilosContractReviewAction,
    submitContractInsideTransaction,
} from './submitContract'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { repositionDraftRates } from './repositionDraftRates'

type UndoWithdrawRateArgsType = {
    rateID: string
    updatedByID: string
    updatedReason: string
}

/**
 * Undo a rate that was withdrawn and place it back onto contracts it was withdrawn from
 *
 * This function performs the following steps
 * 1. Add action to put review status back to `UNDER_REVIEW
 * 2. Unlock the withdrawn rate.
 * 3. Organize contracts it was withdrawn from so that the parent contract is first in restoring relationship.
 * 4. Loop through all contracts rate was withdrawn from to unlock, add rate back, and resubmit contract.
 *    - The first loop is the parent contract and resubmitting the parent contract will also submit the rate.
 * 5. Remove withdrawnFromContracts relationships since we add the rate back onto them.
 *
 * @param tx The Prisma transaction object.
 * @param args The arguments required to withdraw the rate, including rateID, updatedByID, and updatedReason.
 */
const undoWithdrawRateInsideTransaction = async (
    tx: PrismaTransactionType,
    args: UndoWithdrawRateArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, updatedReason } = args

    // Unlock rate
    const rateUnlockInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: new Date(),
            updatedByID: updatedByID,
            updatedReason: `CMS has changed the status of rate to submitted. ${updatedReason}`,
        },
    })
    const unlockedRate = await unlockRateInDB(tx, rateID, rateUnlockInfo.id)

    if (unlockedRate instanceof Error) {
        throw new Error(
            `Cannot unlock withdrawn rate to undo withdraw. ${unlockedRate.message}`
        )
    }

    const withdrawnRate = await findRateWithHistory(tx, rateID)

    if (withdrawnRate instanceof Error) {
        throw new Error(withdrawnRate.message)
    }

    const latestRateRev = withdrawnRate.packageSubmissions[0].rateRevision
    const parentContractID = withdrawnRate.parentContractID

    if (withdrawnRate.reviewStatusActions?.[0]?.actionType !== 'WITHDRAW') {
        throw new Error('Rate to undo withdrawal is not currently withdrawn')
    }

    if (
        !withdrawnRate.withdrawnFromContracts ||
        withdrawnRate.withdrawnFromContracts.length === 0
    ) {
        throw new Error(
            'Withdrawn rate did not contain any contracts it was withdrawn from'
        )
    }

    const withdrawnFromContracts = withdrawnRate.withdrawnFromContracts
    const parentContractIndex = withdrawnFromContracts.findIndex(
        (contract) => contract.id === parentContractID
    )

    if (parentContractIndex === -1) {
        throw new Error(
            'Parent contract not found in contracts rate was withdrawn from'
        )
    }

    // Place parent contract first in the array for undo rate withdraw
    withdrawnFromContracts.unshift(
        withdrawnFromContracts.splice(parentContractIndex, 1)[0]
    )

    // Loop through contracts and undo withdraw rate, starting with parent contract.
    for (const contract of withdrawnFromContracts) {
        const latestRevision = contract.packageSubmissions[0].contractRevision

        // Skip if this contract is now Contract only
        if (latestRevision.formData.submissionType === 'CONTRACT_ONLY') {
            continue
        }

        // Unlock contract to add rate back in
        const unlockedParentContract = await unlockContractInsideTransaction(
            tx,
            {
                contractID: contract.id,
                unlockedByUserID: updatedByID,
                unlockReason: `Undo withdrawal of rate ${latestRateRev.formData.rateCertificationName} from this submission. ${updatedReason}`,
            }
        )

        if (unlockedParentContract instanceof Error) {
            throw new Error(
                `Cannot unlock contract with id ${contract.id}. ${unlockedParentContract.message}`
            )
        }

        const previousRates = unlockedParentContract.draftRates

        // Add rate back into contract
        previousRates.push(withdrawnRate)

        // reposition all rates, after un-withdrawing rate.
        const repositionedRates = repositionDraftRates(
            contract.id,
            previousRates,
            unlockedParentContract.draftRevision.formData.ilosExternalRates
        )

        // arrange rate data for update draft contract rates. The rate added
        // back has no position yet, so it goes after every other rate.
        const updateContractRatesArgs: UpdateDraftContractRatesArgsType = {
            contractID: contract.id,
            rateUpdates: {
                create: [],
                delete: [],
                unlink: [],
                update: repositionedRates.update,
                link: repositionedRates.link,
                external: repositionedRates.external,
            },
        }

        // update the contract to remove the withdrawn rate
        const updateResult = await updateDraftContractRatesInsideTransaction(
            tx,
            updateContractRatesArgs
        )

        if (updateResult instanceof Error) {
            throw new Error(
                `Cannot add rate to contract with id ${contract.id}. ${updateResult.message}`
            )
        }

        const resubmitContractArgs: SubmitContractArgsType = {
            contractID: contract.id,
            submittedByUserID: updatedByID,
            submittedReason: `CMS has changed the status of rate ${latestRateRev.formData.rateCertificationName} to submitted. ${updatedReason}`,
        }

        // resubmit contract with the rate back on it
        const resubmitResult = await submitContractInsideTransaction(
            tx,
            resubmitContractArgs
        )

        if (resubmitResult instanceof Error) {
            throw resubmitResult
        }

        // Undoing a rate withdraw can resubmit every submitted contract that
        // previously contained the rate. Run the same health plan review
        // determination as normal submit so each contract's action history and
        // lastActionDate reflect the final visible action. Linked contracts
        // that are still withdrawn keep their withdrawn status, so skip the
        // review helper for that edge case.
        if (
            ['SUBMITTED', 'RESUBMITTED'].includes(contract.consolidatedStatus)
        ) {
            // ILOS submissions are always under review, so add action
            const reviewDetermination =
                contract.contractSubmissionType === 'ILOS'
                    ? await ilosContractReviewAction(tx, resubmitResult)
                    : await healthPlanContractReviewDeterminationAction(
                          tx,
                          resubmitResult
                      )

            if (reviewDetermination instanceof Error) {
                throw reviewDetermination
            }
        }
    }

    const syncedTimestamp = new Date()

    // This restored review action is what makes the rate no longer withdrawn,
    // so persist the same timestamp as the rate's lastActionDate while also
    // clearing the withdrawn contract joins.
    await tx.rateTable.update({
        where: {
            id: rateID,
        },
        data: {
            reviewStatusActions: {
                create: {
                    updatedByID,
                    updatedReason,
                    actionType: 'UNDER_REVIEW',
                    updatedAt: syncedTimestamp,
                },
            },
            lastActionDate: syncedTimestamp,
            withdrawnFromContracts: {
                deleteMany: {},
            },
        },
    })

    return await findRateWithHistory(tx, rateID)
}

const undoWithdrawRate = async (
    client: ExtendedPrismaClient,
    args: UndoWithdrawRateArgsType
): Promise<RateType | Error> => {
    return runTransactionWithRowLock({
        client,
        operationName: 'undoWithdrawRate',
        table: 'RateTable',
        id: args.rateID,
        transaction: async (tx) =>
            await undoWithdrawRateInsideTransaction(tx, args),
        transactionOptions: {
            timeout: 30000,
        },
    })
}

export {
    undoWithdrawRate,
    undoWithdrawRateInsideTransaction,
    type UndoWithdrawRateArgsType,
}
