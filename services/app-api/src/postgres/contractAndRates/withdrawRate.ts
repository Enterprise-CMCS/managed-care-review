import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import type { ILOSExternalRateType } from '../../domain-models/contractAndRates'
import { findRateWithHistory } from './findRateWithHistory'
import { includeRateRevisionWithRelatedSubmissionContracts } from './prismaSubmittedRateHelpers'
import { includeFullContract } from './prismaFullContractRateHelpers'
import {
    getConsolidatedContractStatus,
    getLatestActiveRevision,
    getContractRateStatus,
    getContractReviewStatus,
    getRelatedContracts,
} from './prismaSharedContractRateHelpers'
import { unlockContractInsideTransaction } from './unlockContract'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import type { SubmitContractArgsType } from './submitContract'
import {
    healthPlanContractReviewDeterminationAction,
    ilosContractReviewAction,
    submitContractInsideTransaction,
} from './submitContract'
import { submitRateInsideTransaction } from './submitRate'
import { parseContractWithHistory } from './parseContractWithHistory'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { repositionDraftRates } from './repositionDraftRates'

type WithdrawRateArgsType = {
    rateID: string
    updatedByID: string
    updatedReason: string
}

/**
 * Withdraws a rate from associated contracts within a transaction.
 *
 * This function performs the following steps:
 * 1. Retrieves the rate and its associated draft contracts and revisions.
 * 2. Collects all contract IDs linked to the rate.
 * 3. Retrieves the contracts associated with these IDs.
 * 4. Removes the rate from each contract, ensuring no approved contracts are affected.
 * 5. Updates the contracts to reflect the removal of the rate.
 * 6. Resubmits any contracts that were unlocked during the process.
 * 7. Resubmits the rate itself.
 * 8. Updates the rate's review status and logs the withdrawal action.
 *
 * @param tx - The Prisma transaction object.
 * @param args - The arguments required to withdraw the rate, including rateID, updatedByID, and updatedReason.
 */
const withdrawRateInsideTransaction = async (
    tx: PrismaTransactionType,
    args: WithdrawRateArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, updatedReason } = args

    const rate = await tx.rateTable.findFirst({
        where: {
            id: rateID,
        },
        include: {
            draftContracts: {
                select: {
                    contractID: true,
                },
            },
            revisions: {
                orderBy: {
                    createdAt: 'desc',
                },
                // needed by getRelatedContracts
                include: includeRateRevisionWithRelatedSubmissionContracts,
            },
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

    if (!rate) {
        throw new NotFoundError(
            `PRISMA ERROR: Cannot find rate with id: ${rateID}`
        )
    }

    if (rate.reviewStatusActions[0]?.actionType === 'WITHDRAW') {
        throw new Error('Cannot withdraw rate: rate is already withdrawn')
    }

    const latestRateRev = getLatestActiveRevision(rate.revisions)
    if (!latestRateRev) {
        throw new Error(`Could not find active revision for rate ${rateID}`)
    }

    // collect the contracts last submitted with this rate. A contract that
    // linked the rate and was later resubmitted without it is not one of them.
    const submittedContractsIds = getRelatedContracts(rate).map(
        (contract) => contract.id
    )

    // collect all draft contracts linked to this rate
    const draftContractsIds = rate.draftContracts.map(
        (contract) => contract.contractID
    )

    // create new array of unique contractIDs
    const contractIDs = [
        ...new Set([...submittedContractsIds, ...draftContractsIds]),
    ]

    // get data for every contract
    const contracts = await tx.contractTable.findMany({
        where: {
            id: {
                in: contractIDs,
            },
        },
        include: {
            ...includeFullContract,
        },
    })

    // collect contractIDs we remove the rate from to make the new connection on the withdrawn rate table
    const withdrawnFromContracts: { contractID: string }[] = []

    // Remove rate from each contract
    for (const contract of contracts) {
        // Used to track original status of the contract
        const consolidatedStatus = getConsolidatedContractStatus(
            getContractRateStatus(contract.revisions),
            getContractReviewStatus(contract.reviewStatusActions)
        )

        // Throw error if any contract is approved
        if (consolidatedStatus === 'APPROVED') {
            throw new Error(
                `Rate is a child or linked to an APPROVED contract with ID: ${contract.id}`
            )
        }

        let previousRates = []
        // ILOS submissions only. External rates share one position sequence with the linked rates.
        let ilosExternalRates: ILOSExternalRateType[] = []

        // If the contract is locked, unlock it and set previousRates.
        if (
            ['SUBMITTED', 'RESUBMITTED', 'WITHDRAWN'].includes(
                consolidatedStatus
            )
        ) {
            const unlockedContract = await unlockContractInsideTransaction(tx, {
                contractID: contract.id,
                unlockedByUserID: updatedByID,
                unlockReason: `CMS withdrawing rate ${latestRateRev.rateCertificationName} from this submission. ${updatedReason}`,
            })

            if (unlockedContract instanceof Error) {
                throw unlockedContract
            }

            previousRates = unlockedContract.draftRates
            ilosExternalRates =
                unlockedContract.draftRevision.formData.ilosExternalRates

            // Add contract to connect on withdrawn rate join table
            withdrawnFromContracts.push({ contractID: contract.id })
        } else {
            // parse the contract to get the draft rates in domain type
            const parsedContract = parseContractWithHistory(contract)

            if (parsedContract instanceof Error) {
                throw parsedContract
            }

            if (!parsedContract.draftRates) {
                throw new Error(
                    `Contract ${contract.id} is missing draft rates`
                )
            }

            // The contract was last submitted with the rate, but it is
            // unlocked and the rate is already removed from its draft. There
            // is nothing to remove and it is not a withdrawn rate on the contract.
            const draftHasRate = parsedContract.draftRates.some(
                (draftRate) => draftRate.id === rateID
            )
            if (!draftHasRate) {
                continue
            }

            const lastRecentSubmission = parsedContract.packageSubmissions[0]

            // Do not connect on withdrawn rate join table if contract has never been submitted with the rate to be withdrawn.
            if (consolidatedStatus === 'UNLOCKED' && lastRecentSubmission) {
                const wasSubmittedWithWithdrawnRate =
                    lastRecentSubmission.rateRevisions.find(
                        (rr) => rr.rateID === rateID
                    )
                // If Unlocked contract was last submitted with rate to be withdrawn, add to withdrawn rate join table
                if (wasSubmittedWithWithdrawnRate) {
                    withdrawnFromContracts.push({ contractID: contract.id })
                }
            }

            previousRates = parsedContract.draftRates
            ilosExternalRates =
                parsedContract.draftRevision?.formData.ilosExternalRates ?? []
        }

        const rateToWithdrawIndex = previousRates
            .map((rate) => rate.id)
            .indexOf(rateID)

        // validate that the rate to withdraw exists on the contract
        if (rateToWithdrawIndex === -1) {
            throw new UserInputPostgresError(
                `withdrawnRateID ${rateID} does not map to a current rate on this contract`
            )
        }

        // remove the rate to withdraw from previousRates. Removing it here prevents gaps in ratePosition.
        previousRates.splice(rateToWithdrawIndex, 1)

        // reposition all rates, after removing the withdrawn rates.
        const repositionedRates = repositionDraftRates(
            contract.id,
            previousRates,
            ilosExternalRates
        )

        // arrange rate data for update draft contract rates. Renumbering the
        // rates we keep closes the gap the withdrawn rate leaves.
        const updateContractRatesArgs: UpdateDraftContractRatesArgsType = {
            contractID: contract.id,
            rateUpdates: {
                create: [],
                delete: [],
                unlink: [],
                update: repositionedRates.update, // health plan submission only
                link: repositionedRates.link,
                external: repositionedRates.external, //ilos submission only
            },
        }

        // update the contract to remove the withdrawn rate
        const updateResult = await updateDraftContractRatesInsideTransaction(
            tx,
            updateContractRatesArgs
        )

        if (updateResult instanceof Error) {
            throw updateResult
        }

        // Resubmit contract if it was unlocked in this loop. We know because of original consolidatedStatus
        if (
            ['SUBMITTED', 'RESUBMITTED', 'WITHDRAWN'].includes(
                consolidatedStatus
            )
        ) {
            const resubmitContractArgs: SubmitContractArgsType = {
                contractID: contract.id,
                submittedByUserID: updatedByID,
                submittedReason: `CMS has withdrawn rate ${latestRateRev.rateCertificationName} from this submission. ${updatedReason}`,
            }
            const resubmitResult = await submitContractInsideTransaction(
                tx,
                resubmitContractArgs
            )
            if (resubmitResult instanceof Error) {
                throw resubmitResult
            }

            // Withdrawing a rate can resubmit the affected health plan
            // contract. Run the same review determination as normal submit so
            // the contract action history and lastActionDate reflect the final
            // visible action. Skip the withdrawn-contract edge case because the
            // review helper intentionally rejects currently withdrawn review
            // status.
            if (['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)) {
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
    }

    // Resubmit the rate
    const submitRate = await submitRateInsideTransaction(tx, {
        rateID,
        formData: undefined,
        submittedByUserID: updatedByID,
        submittedReason: 'CMS has withdrawn this rate. ' + updatedReason,
    })

    if (submitRate instanceof Error) {
        throw submitRate
    }

    // A withdrawn rate should not remain in any draft working set, whether the
    // contract had previously submitted the rate or was only linked in draft.
    await tx.draftRateJoinTable.deleteMany({
        where: {
            rateID,
        },
    })

    const syncedTimestamp = new Date()

    // This review action is what makes the rate withdrawn, so it is the action
    // date we persist for lastActionDate. The submit above already captured
    // the submitted-data change for the rate. Also create new joins on the
    // withdrawn rate join table
    await tx.rateTable.update({
        where: {
            id: rateID,
        },
        data: {
            reviewStatusActions: {
                create: {
                    updatedByID,
                    updatedReason,
                    updatedAt: syncedTimestamp,
                    actionType: 'WITHDRAW',
                },
            },
            lastActionDate: syncedTimestamp,
            withdrawnFromContracts: {
                create: withdrawnFromContracts,
            },
        },
    })

    return findRateWithHistory(tx, rateID)
}

const withdrawRate = async (
    client: ExtendedPrismaClient,
    args: WithdrawRateArgsType
): Promise<RateType | Error> => {
    return runTransactionWithRowLock({
        client,
        operationName: 'withdrawRate',
        table: 'RateTable',
        id: args.rateID,
        transaction: async (tx) =>
            await withdrawRateInsideTransaction(tx, args),
        transactionOptions: {
            timeout: 30000,
        },
    })
}

export {
    withdrawRate,
    withdrawRateInsideTransaction,
    type WithdrawRateArgsType,
}
