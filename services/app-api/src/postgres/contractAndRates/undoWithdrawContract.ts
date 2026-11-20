import type { ContractType } from '../../domain-models'
import type { RateForDisplayType } from '../../emailer/templateHelpers'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { unlockContractInsideTransaction } from './unlockContract'
import {
    ilosContractReviewAction,
    submitContractInsideTransaction,
} from './submitContract'
import { findContractWithHistory } from './findContractWithHistory'
import {
    eqroValidationAndReviewDetermination,
    healthPlanReviewDetermination,
} from '@mc-review/submissions'
import {
    runTransactionWithRowLock,
    lockTableRowForUpdate,
} from '../prismaHelpers'
import { includeFullContract } from './prismaFullContractRateHelpers'
import { parseContractWithHistory } from './parseContractWithHistory'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import { repositionDraftRates } from './repositionDraftRates'

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
 * Links rates back to the ILOS submissions they were removed from when their parent contract was withdrawn.
 *
 * For each ILOS submission that has any of the rates in its withdrawn rates, this function:
 * 1. Unlocks the ILOS submission if it is submitted
 * 2. Adds the rates back after every linked and external rate already on it
 * 3. Removes the rates from the ILOS submission's withdrawn rates
 * 4. Resubmits the ILOS submission if it was unlocked here
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param args.rates - The child rates restored with the contract
 * @param args.parentContractID - ID of the contract the rates are child rates of
 * @param args.updatedByID - ID of the user performing undo withdrawal
 * @param args.updatedReason - The reason for undoing withdrawal
 */
const undoWithdrawRatesFromILOSInTransaction = async (
    tx: PrismaTransactionType,
    args: {
        rates: RateForDisplayType[]
        parentContractID: string
        updatedByID: string
        updatedReason: string
    }
): Promise<void> => {
    const { rates, parentContractID, updatedByID, updatedReason } = args

    // ILOS submissions that have any of the rates in their withdrawn rates.
    const ilosSubmissionIDs = await tx.contractTable.findMany({
        where: {
            contractSubmissionType: 'ILOS',
            withdrawnRates: {
                some: { rateID: { in: rates.map((rate) => rate.id) } },
            },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
    })

    // Lock each ILOS submission before reading it, so a concurrent undo
    // withdraw that changes the same ILOS submission waits for this one to
    // commit.
    for (const { id } of ilosSubmissionIDs) {
        await lockTableRowForUpdate(tx, 'ContractTable', id)
    }

    const ilosSubmissions = await tx.contractTable.findMany({
        where: { id: { in: ilosSubmissionIDs.map((c) => c.id) } },
        include: {
            ...includeFullContract,
        },
    })

    // Each ILOS submission is unlocked and resubmitted once, with every
    // rate withdrawn from it added back together.
    for (const ilosSubmission of ilosSubmissions) {
        const parsedILOSSubmission = parseContractWithHistory(ilosSubmission)

        if (parsedILOSSubmission instanceof Error) {
            throw parsedILOSSubmission
        }

        // Used to track original status of the ILOS submission
        const ilosStatus = parsedILOSSubmission.consolidatedStatus
        const wasLocked = ['SUBMITTED', 'RESUBMITTED', 'WITHDRAWN'].includes(
            ilosStatus
        )

        // Throw error if the ILOS submission is approved
        if (ilosStatus === 'APPROVED') {
            throw new Error(
                `Rate was withdrawn from an APPROVED ILOS submission with ID: ${ilosSubmission.id}`
            )
        }

        // The rates that were withdrawn from this ILOS submission.
        const ratesToAddBack = rates.filter((rate) =>
            ilosSubmission.withdrawnRates.some((wr) => wr.rateID === rate.id)
        )
        const rateNames = ratesToAddBack
            .map((rate) => rate.rateCertificationName)
            .join(', ')

        let draftILOSSubmission = parsedILOSSubmission

        // Unlock the ILOS submission to add the rates back in
        if (wasLocked) {
            const unlockedILOSSubmission =
                await unlockContractInsideTransaction(tx, {
                    contractID: ilosSubmission.id,
                    unlockedByUserID: updatedByID,
                    unlockReason: `Undo withdrawal of rate(s) ${rateNames} from this submission. ${updatedReason}`,
                })

            if (unlockedILOSSubmission instanceof Error) {
                throw new Error(
                    `Cannot unlock ILOS submission with id ${ilosSubmission.id}. ${unlockedILOSSubmission.message}`
                )
            }

            draftILOSSubmission = unlockedILOSSubmission
        }

        if (!draftILOSSubmission.draftRevision) {
            throw new Error(
                `ILOS submission ${ilosSubmission.id} is missing draft revision`
            )
        }

        const repositionedRates = repositionDraftRates(
            ilosSubmission.id,
            [
                ...(draftILOSSubmission.draftRates ?? []),
                ...ratesToAddBack.map((rate) => ({
                    id: rate.id,
                    parentContractID,
                })),
            ],
            draftILOSSubmission.draftRevision.formData.ilosExternalRates
        )

        // update the ILOS submission to add the rates back. They have no
        // position yet, so they go after every linked and external rate.
        const updateResult = await updateDraftContractRatesInsideTransaction(
            tx,
            {
                contractID: ilosSubmission.id,
                rateUpdates: {
                    create: [],
                    delete: [],
                    unlink: [],
                    update: repositionedRates.update,
                    link: repositionedRates.link,
                    external: repositionedRates.external,
                },
            }
        )

        if (updateResult instanceof Error) {
            throw new Error(
                `Cannot add rate to ILOS submission with id ${ilosSubmission.id}. ${updateResult.message}`
            )
        }

        await tx.withdrawnRatesJoinTable.deleteMany({
            where: {
                contractID: ilosSubmission.id,
                rateID: { in: ratesToAddBack.map((rate) => rate.id) },
            },
        })

        // Resubmit the ILOS submission if it was unlocked in this loop.
        if (wasLocked) {
            const resubmitResult = await submitContractInsideTransaction(tx, {
                contractID: ilosSubmission.id,
                submittedByUserID: updatedByID,
                submittedReason: `CMS has changed the status of rate(s) ${rateNames} to submitted. ${updatedReason}`,
            })

            if (resubmitResult instanceof Error) {
                throw resubmitResult
            }

            // Record the same review action as a normal ILOS submit. Skip
            // a withdrawn ILOS submission because the review helper
            // rejects withdrawn review status.
            if (['SUBMITTED', 'RESUBMITTED'].includes(ilosStatus)) {
                const reviewAction = await ilosContractReviewAction(
                    tx,
                    resubmitResult
                )

                if (reviewAction instanceof Error) {
                    throw reviewAction
                }
            }
        }
    }
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
        unlockReason: `CMS undoing submission withdrawal. ${updatedReason}`,
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

    // Resubmit contract and child rates
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

    // Determine restored review status — mirrors submitContract logic so that
    // NOT_SUBJECT_TO_REVIEW submissions (EQRO with no review-triggering
    // provisions, CHIP-only HEALTH_PLAN) return to NOT_SUBJECT_TO_REVIEW
    // rather than flipping to UNDER_REVIEW.
    let restoredActionType: 'UNDER_REVIEW' | 'NOT_SUBJECT_TO_REVIEW' =
        'UNDER_REVIEW'
    const latestSubmission = resubmitContract.packageSubmissions[0]
    if (!latestSubmission) {
        throw new Error(
            'Cannot determine review on undo-withdraw: contract has no submitted revision'
        )
    }

    if (resubmitContract.contractSubmissionType === 'EQRO') {
        const reviewDetermination = eqroValidationAndReviewDetermination(
            resubmitContract.id,
            latestSubmission.contractRevision.formData
        )
        if (reviewDetermination instanceof Error) {
            throw reviewDetermination
        }
        restoredActionType = reviewDetermination
            ? 'UNDER_REVIEW'
            : 'NOT_SUBJECT_TO_REVIEW'
    } else if (resubmitContract.contractSubmissionType === 'HEALTH_PLAN') {
        const subjectToReview = healthPlanReviewDetermination(
            latestSubmission.contractRevision.formData
        )
        restoredActionType = subjectToReview
            ? 'UNDER_REVIEW'
            : 'NOT_SUBJECT_TO_REVIEW'
    }

    // This restored review action is what makes the contract no longer
    // withdrawn, so it is the action date we persist for lastActionDate.
    const contractReviewAction = await tx.contractActionTable.create({
        data: {
            contractID: contract.id,
            updatedByID,
            updatedReason,
            actionType: restoredActionType,
        },
    })

    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            lastActionDate: contractReviewAction.updatedAt,
        },
    })

    // Withdrawing the contract removed its child rates from the ILOS
    // submissions that linked them. Link them back now that the rates are
    // resubmitted with this contract.
    await undoWithdrawRatesFromILOSInTransaction(tx, {
        rates: ratesForDisplay,
        parentContractID: contract.id,
        updatedByID,
        updatedReason,
    })

    for (const rate of ratesForDisplay) {
        // This restored review action is what makes the rate no longer
        // withdrawn, so it is the action date we persist for lastActionDate.
        const rateReviewAction = await tx.rateActionTable.create({
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

        await tx.rateTable.update({
            where: {
                id: rate.id,
            },
            data: {
                lastActionDate: rateReviewAction.updatedAt,
            },
        })
    }

    const undoWithdrawnContract = await findContractWithHistory(tx, contract.id)

    if (undoWithdrawnContract instanceof Error) {
        throw new Error(undoWithdrawnContract.message)
    }

    if (
        !['RESUBMITTED', 'NOT_SUBJECT_TO_REVIEW'].includes(
            undoWithdrawnContract.consolidatedStatus
        )
    ) {
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
    return runTransactionWithRowLock({
        client,
        operationName: 'undoWithdrawContract',
        table: 'ContractTable',
        id: args.contract.id,
        transaction: async (tx) =>
            await undoWithdrawContractInsideTransaction(tx, args),
        transactionOptions: {
            timeout: 30000,
        },
    })
}

export { undoWithdrawContract }
