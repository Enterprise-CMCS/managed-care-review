import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models'
import { unlockContractInsideTransaction } from './unlockContract'
import { findStatePrograms } from '../state'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { ConsolidatedContractStatus } from '../../gen/gqlServer'
import { submitContractAndOrRates } from './submitContractAndOrRates'
import { includeRateRevisionWithRelatedSubmissionContracts } from './prismaSubmittedRateHelpers'
import type { RateRevisionTableWithRelatedSubmissionContracts } from './prismaSubmittedRateHelpers'
import {
    getNewParentContract,
    getLatestActiveRevision,
    getParentContractID,
} from './prismaSharedContractRateHelpers'
import type { RatesToReassign } from './reassignParentContract'
import { reassignParentContractInTransaction } from './reassignParentContract'
import type { RateForDisplayType } from '../../emailer/templateHelpers'
import {
    runTransactionWithRowLock,
    lockTableRowForUpdate,
} from '../prismaHelpers'
import { includeFullContract } from './prismaFullContractRateHelpers'
import { parseContractWithHistory } from './parseContractWithHistory'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import {
    ilosContractReviewAction,
    submitContractInsideTransaction,
} from './submitContract'
import { repositionDraftRates } from './repositionDraftRates'

export type WithdrawContractArgsType = {
    contract: ContractType
    updatedByID: string
    updatedReason: string
}

export type WithdrawContractReturnType = {
    withdrawnContract: ContractType
    ratesForDisplay: RateForDisplayType[]
}

/**
 * Removes rates that are being withdrawn with a contract from the ILOS submissions that link them.
 *
 * An ILOS submission can link a rate but cannot be its parent, so it never takes over a rate
 * from a withdrawn contract. For each ILOS submission that has any of the rates, this function:
 * 1. Unlocks the ILOS submission if it is submitted
 * 2. Removes the rates and renumbers the linked and external rates left on it
 * 3. Moves the rates to the ILOS submission's withdrawn rates
 * 4. Resubmits the ILOS submission if it was unlocked here
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param args.ratesToWithdraw - The child rates being withdrawn with the contract
 * @param args.updatedByID - ID of the user performing the withdrawal
 * @param args.updatedReason - The reason for withdrawal
 */
const withdrawRatesFromILOSInTransaction = async (
    tx: PrismaTransactionType,
    args: {
        ratesToWithdraw: {
            id: string
            revisions: RateRevisionTableWithRelatedSubmissionContracts[]
        }[]
        updatedByID: string
        updatedReason: string
    }
): Promise<void> => {
    const { ratesToWithdraw, updatedByID, updatedReason } = args

    const withdrawRateIDs = ratesToWithdraw.map((rate) => rate.id)

    // ILOS submissions that have ever had any of the rates. The loop below only
    // changes the ones that still have them, on their draft or latest submission.
    const ilosSubmissionIDs = await tx.contractTable.findMany({
        where: {
            contractSubmissionType: 'ILOS',
            OR: [
                { draftRates: { some: { rateID: { in: withdrawRateIDs } } } },
                {
                    revisions: {
                        some: {
                            submissionPackages: {
                                some: {
                                    rateRevision: {
                                        rateID: { in: withdrawRateIDs },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
    })

    // Lock each ILOS submission before reading it, so a concurrent withdraw
    // that changes the same ILOS submission waits for this one to commit.
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
    // withdrawn rate it links removed together.
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

        // The rates to withdraw that the ILOS submission was last submitted with.
        const lastSubmittedRateIDs =
            parsedILOSSubmission.packageSubmissions[0]?.rateRevisions.map(
                (rr) => rr.rateID
            ) ?? []
        const submittedRatesToWithdraw = ratesToWithdraw.filter((rate) =>
            lastSubmittedRateIDs.includes(rate.id)
        )
        const rateNames = submittedRatesToWithdraw
            .map(
                (rate) =>
                    getLatestActiveRevision(rate.revisions)
                        ?.rateCertificationName ?? 'Unknown Rate'
            )
            .join(', ')

        let draftILOSSubmission = parsedILOSSubmission

        if (ilosStatus === 'APPROVED' || wasLocked) {
            // The rates were only on an earlier submission, nothing to remove.
            if (submittedRatesToWithdraw.length === 0) {
                continue
            }

            // Throw error if the ILOS submission is approved
            if (ilosStatus === 'APPROVED') {
                throw new Error(
                    `Rate is linked to an APPROVED ILOS submission with ID: ${ilosSubmission.id}`
                )
            }

            const unlockedILOSSubmission =
                await unlockContractInsideTransaction(tx, {
                    contractID: ilosSubmission.id,
                    unlockedByUserID: updatedByID,
                    unlockReason: `CMS withdrawing rate(s) ${rateNames} from this submission. ${updatedReason}`,
                })

            if (unlockedILOSSubmission instanceof Error) {
                throw unlockedILOSSubmission
            }

            draftILOSSubmission = unlockedILOSSubmission
        }

        const draftRates = draftILOSSubmission.draftRates ?? []
        const draftRatesToKeep = draftRates.filter(
            (draftRate) => !withdrawRateIDs.includes(draftRate.id)
        )

        // None of the rates are on this draft, nothing to remove.
        if (draftRatesToKeep.length === draftRates.length) {
            continue
        }

        if (!draftILOSSubmission.draftRevision) {
            throw new Error(
                `ILOS submission ${ilosSubmission.id} is missing draft revision`
            )
        }

        const repositionedRates = repositionDraftRates(
            ilosSubmission.id,
            draftRatesToKeep,
            draftILOSSubmission.draftRevision.formData.ilosExternalRates
        )

        // update the ILOS submission to remove the withdrawn rates.
        // Linked and external rates share positions, so renumber both
        // together to close the gaps they leave.
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
            throw updateResult
        }

        // Only connect on withdrawn rate join table the rates that were on
        // the draft and that the ILOS submission was last submitted with.
        await tx.withdrawnRatesJoinTable.createMany({
            data: submittedRatesToWithdraw
                .filter((rate) =>
                    draftRates.some((draftRate) => draftRate.id === rate.id)
                )
                .map((rate) => ({
                    contractID: ilosSubmission.id,
                    rateID: rate.id,
                })),
        })

        // Resubmit the ILOS submission if it was unlocked in this loop.
        if (wasLocked) {
            const resubmitResult = await submitContractInsideTransaction(tx, {
                contractID: ilosSubmission.id,
                submittedByUserID: updatedByID,
                submittedReason: `CMS has withdrawn rate(s) ${rateNames} from this submission. ${updatedReason}`,
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
 * Withdraws a contract and its associated eligible rates within a database transaction.
 *
 * This function performs the following operations:
 * 1. Identifies child rates that should be withdrawn with the contract
 * 2. Identifies child rates that cannot be withdrawn should be assigned a new parent contract
 * 3. Unlocks the contract and child rates with a withdrawal reason
 * 4. Assign new parent contracts for rates that cannot be withdrawn
 * 5. Resubmits the contract and child rates with a withdrawal reason
 * 6. Creates a withdrawal action for the contract
 * 7. Creates withdrawal actions for all eligible associated rates
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param {WithdrawContractArgsType} args - Withdrawal arguments
 * @param {ContractType} args.contract - The contract to withdraw
 * @param {string} args.updatedReason - The reason for withdrawal
 * @param {string} args.updatedByID - ID of the user performing the withdrawal
 *
 */
const withdrawContractInsideTransaction = async (
    tx: PrismaTransactionType,
    args: WithdrawContractArgsType
): Promise<WithdrawContractReturnType> => {
    const { contract, updatedReason, updatedByID } = args

    const currentContractReviewStatus = await tx.contractTable.findUnique({
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

    if (!currentContractReviewStatus) {
        throw new NotFoundError(
            `Could not find contract ${contract.id} to withdraw.`
        )
    }

    if (
        currentContractReviewStatus.reviewStatusActions[0]?.actionType ===
        'WITHDRAW'
    ) {
        throw new Error(
            'Cannot withdraw contract: contract is already withdrawn'
        )
    }

    const latestSubmission = contract.packageSubmissions[0]
    const rateIDS = latestSubmission.rateRevisions.map((rr) => rr.rateID)

    // Very stripped down rate, only selecting data we need to determine which rates are to be withdrawn with contract.
    const rates = await tx.rateTable.findMany({
        where: {
            id: {
                in: rateIDS,
            },
        },
        include: {
            reviewStatusActions: {
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                    actionType: true,
                },
            },
            revisions: {
                orderBy: {
                    createdAt: 'desc',
                },
                include: includeRateRevisionWithRelatedSubmissionContracts,
            },
        },
    })

    if (!rates) {
        throw new NotFoundError(
            'Could not find rates on contract to be withdrawn'
        )
    }

    // Child rates to withdraw with the submission, so it includes the same withdraw reason
    const ratesToWithdraw = []

    // Hashmap of contracts that will have reassigned rates. Multiple rates can be reassigned in one reassignParentContractInTransaction
    const reassignParentContracts: {
        [key: string]: {
            rates: RatesToReassign[]
            contractStatus: ConsolidatedContractStatus
        }
    } = {}

    // Loop through all rates to determine which ones can be withdrawn or reassigned parent contract
    for (const rate of rates) {
        const latestRateRevision = getLatestActiveRevision(rate.revisions)

        if (!latestRateRevision) {
            throw new Error(
                `Could not find active revision for rate ${rate.id}`
            )
        }

        // get the latest parentContract ID of the rate
        const parentContractID = getParentContractID(rate.revisions)

        if (parentContractID instanceof Error) {
            throw new Error(
                `Cannot get parentContractID of rate ${rate.id}: ${parentContractID.message}`
            )
        }

        // skipping rate if conditions are met
        if (
            rate.reviewStatusActions[0]?.actionType === 'WITHDRAW' || // is the rate already withdrawn
            parentContractID !== contract.id // if it is a linked rate
        ) {
            continue
        }

        const reassignToContractID = getNewParentContract(rate.revisions)

        // Reassign if there is a valid contract to reassign to, otherwise we set rate for withdraw
        if (reassignToContractID) {
            const { contractID, status } = reassignToContractID
            const reassignRate = {
                rateID: rate.id,
                rateName:
                    latestRateRevision.rateCertificationName ?? 'Unknown Rate',
            }

            // if the contract exists in the dictionary, then add the rate to the array else add a new entry with rate and contract status
            if (!reassignParentContracts[contractID]) {
                reassignParentContracts[contractID] = {
                    rates: [],
                    contractStatus: status,
                }
            }
            reassignParentContracts[contractID].rates.push(reassignRate)
        } else {
            // Abort withdraw any child rates we want to withdraw is not submitted
            if (!latestRateRevision.submitInfo) {
                throw new Error(
                    `Child rate ${rate.id} of contract to be withdrawn is not submitted.`
                )
            }

            ratesToWithdraw.push(rate)
        }
    }

    // Lock each new parent contract before changing it, so a concurrent
    // withdraw that reassigns a rate to the same contract waits for this one
    // to commit.
    for (const id of Object.keys(reassignParentContracts).sort()) {
        await lockTableRowForUpdate(tx, 'ContractTable', id)
    }

    // A child rate with no new parent is withdrawn with the contract. ILOS
    // submissions can link it but cannot be its parent, so remove it from them
    // and move it to their withdrawn rates.
    await withdrawRatesFromILOSInTransaction(tx, {
        ratesToWithdraw,
        updatedByID,
        updatedReason,
    })

    const statePrograms = findStatePrograms(contract.stateCode)

    if (statePrograms instanceof Error) {
        throw new Error(
            `State programs for stateCode ${contract.stateCode} not found.`
        )
    }

    // unlock contract with withdraw default message and withdraw input reason
    const unlockContract = await unlockContractInsideTransaction(tx, {
        contractID: contract.id,
        unlockedByUserID: updatedByID,
        unlockReason: `Withdraw submission. ${updatedReason}`,
    })

    if (unlockContract instanceof Error) {
        throw new Error(
            `Cannot unlock contract to be withdrawn. ${unlockContract.message}`
        )
    }

    // loop through the new parent contracts to assign its new child rates
    for (const [contractID, reassignmentData] of Object.entries(
        reassignParentContracts
    )) {
        await reassignParentContractInTransaction(tx, {
            contractID,
            rates: reassignmentData.rates,
            contractStatus: reassignmentData.contractStatus,
            updatedByID,
            statePrograms,
        })
    }

    const resubmitWithdrawnContract = await submitContractAndOrRates(
        tx,
        contract.id,
        ratesToWithdraw.map((rate) => rate.id),
        updatedByID,
        `CMS withdrew the submission from review. ${updatedReason}`
    )

    if (resubmitWithdrawnContract instanceof Error) {
        throw new Error(
            `Could not resubmit contract to be withdrawn. ${resubmitWithdrawnContract.message}`
        )
    }

    // The unlock and resubmit above already moved lastActionDate for their
    // actions. The withdrawal review action is the final visible action for
    // this contract, so it should be the stored freshness date.
    const contractWithdrawAction = await tx.contractActionTable.create({
        data: {
            contractID: contract.id,
            updatedByID,
            updatedReason,
            actionType: 'WITHDRAW',
        },
    })

    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            lastActionDate: contractWithdrawAction.updatedAt,
        },
    })

    const ratesForDisplay: RateForDisplayType[] = []
    for (const rate of ratesToWithdraw) {
        // Grabbing necessary rate info to display in notif email
        ratesForDisplay.push({
            id: rate.id,
            rateCertificationName:
                getLatestActiveRevision(rate.revisions)
                    ?.rateCertificationName ?? 'Unknown Rate',
        })

        // The submit above moved lastActionDate for submitted child rate data.
        // The withdrawal review action is the final visible action for each
        // withdrawn rate, so it should become the stored freshness date.
        const rateWithdrawAction = await tx.rateActionTable.create({
            data: {
                updatedReason,
                updatedBy: {
                    connect: {
                        id: updatedByID,
                    },
                },
                actionType: 'WITHDRAW',
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
                lastActionDate: rateWithdrawAction.updatedAt,
            },
        })
    }

    // fetch contract with history and validate withdraw
    const withdrawnContract = await findContractWithHistory(tx, contract.id)

    if (withdrawnContract instanceof Error) {
        throw new Error(withdrawnContract.message)
    }

    if (withdrawnContract.consolidatedStatus !== 'WITHDRAWN') {
        throw new Error('Contract failed to withdraw')
    }

    return {
        withdrawnContract,
        ratesForDisplay,
    }
}

const withdrawContract = async (
    client: ExtendedPrismaClient,
    args: WithdrawContractArgsType
): Promise<WithdrawContractReturnType | Error> => {
    return runTransactionWithRowLock({
        client,
        operationName: 'withdrawContract',
        table: 'ContractTable',
        id: args.contract.id,
        transaction: async (tx) =>
            await withdrawContractInsideTransaction(tx, args),
        transactionOptions: {
            timeout: 30000,
        },
    })
}

export { withdrawContractInsideTransaction, withdrawContract }
