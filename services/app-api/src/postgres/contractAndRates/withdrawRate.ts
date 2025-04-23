import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import { findRateWithHistory } from './findRateWithHistory'

import { includeFullContract } from './prismaFullContractRateHelpers'
import {
    getConsolidatedContractStatus,
    getContractRateStatus,
    getContractReviewStatus,
} from './prismaSharedContractRateHelpers'
import { unlockContractInsideTransaction } from './unlockContract'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import type { SubmitContractArgsType } from './submitContract'
import { submitContractInsideTransaction } from './submitContract'
import { submitRateInsideTransaction } from './submitRate'
import { parseContractWithHistory } from './parseContractWithHistory'
import type { ExtendedPrismaClient } from '../prismaClient'

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
                include: {
                    relatedSubmissions: {
                        orderBy: {
                            updatedAt: 'desc',
                        },
                        include: {
                            submittedContracts: true,
                        },
                    },
                },
            },
        },
    })

    if (!rate) {
        throw new NotFoundError(
            `PRISMA ERROR: Cannot find rate with id: ${rateID}`
        )
    }

    // collect all contracts submitted with this rate
    const submittedContractsIds = rate.revisions[0].relatedSubmissions
        .map((sub) =>
            sub.submittedContracts.map((contract) => contract.contractID)
        )
        .flat()

    // collect all draft contracts linked to this rate
    const draftContractsIds = rate.draftContracts.map(
        (contract) => contract.contractID
    )

    // create new array of unique contractIDs
    const contractIDs = [
        ...new Set([...submittedContractsIds, ...draftContractsIds]),
    ]

    // Get the contractIDs of the latest submission package of each related submission
    const latestRateRev = rate.revisions[0]

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

        const updateRates: UpdateDraftContractRatesArgsType['rateUpdates']['update'] =
            []
        const linkRates: UpdateDraftContractRatesArgsType['rateUpdates']['link'] =
            []

        let previousRates = []

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

        // Collect rates we keep on the contract
        previousRates.forEach((rate, idx) => {
            if (rate.parentContractID !== contract.id) {
                linkRates.push({
                    rateID: rate.id,
                    ratePosition: idx + 1,
                })
            } else {
                // We unlocked any contract that was submitted. Now all rates are drafts so we use draftRevision to get form data.
                if (!rate.draftRevision) {
                    throw new Error(
                        `Draft rate ${rate.id} is missing draft revision`
                    )
                }

                const formData = rate.draftRevision?.formData

                updateRates.push({
                    rateID: rate.id,
                    formData: {
                        ...formData,
                    },
                    ratePosition: idx + 1,
                })
            }
        })

        // arrange rate data for update draft contract rates
        const updateContractRatesArgs: UpdateDraftContractRatesArgsType = {
            contractID: contract.id,
            rateUpdates: {
                create: [],
                update: [
                    //  keep any already added child rates
                    ...updateRates,
                ],
                delete: [],
                unlink: [],
                link: [
                    // keep any other already added linked rates
                    ...linkRates.sort(
                        (a, b) => a.ratePosition - b.ratePosition
                    ),
                ],
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

    // Add review status action to rate and create new joins on withdrawn rate join table
    await tx.rateTable.update({
        where: {
            id: rateID,
        },
        data: {
            reviewStatusActions: {
                create: {
                    updatedByID,
                    updatedReason,
                    actionType: 'WITHDRAW',
                },
            },
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
    try {
        return await client.$transaction(
            async (tx) => await withdrawRateInsideTransaction(tx, args),
            {
                timeout: 30000,
            }
        )
    } catch (err) {
        console.error('PRISMA ERROR: Error withdrawing rate', err)
        return err
    }
}

export {
    withdrawRate,
    withdrawRateInsideTransaction,
    type WithdrawRateArgsType,
}
