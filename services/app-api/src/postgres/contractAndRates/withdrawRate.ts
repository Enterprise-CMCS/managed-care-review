import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import { findRateWithHistory } from './findRateWithHistory'
import type { PrismaClient } from '@prisma/client'
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

type WithdrawRateArgsType = {
    rateID: string
    updatedByID: string
    updatedReason: string
}

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
                            submissionPackages: {
                                include: {
                                    contractRevision: {
                                        select: {
                                            id: true,
                                            contractID: true,
                                        },
                                    },
                                },
                                orderBy: {
                                    ratePosition: 'asc',
                                },
                            },
                        },
                    },
                },
            },
        },
    })

    if (!rate) {
        const err = `PRISMA ERROR: Cannot find rate with id: ${rateID}`
        return new NotFoundError(err)
    }

    // Get the contractIDs of the latest submission package of each related submission
    const latestRevision = rate.revisions[0]
    const contractIDs = [
        ...new Set([
            ...latestRevision.relatedSubmissions.map(
                (sub) => sub.submissionPackages[0].contractRevision.contractID
            ),
            ...rate.draftContracts.map((contract) => contract.contractID),
        ]),
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
            getContractReviewStatus(contract)
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
        if (['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)) {
            const unlockedContract = await unlockContractInsideTransaction(tx, {
                contractID: contract.id,
                unlockedByUserID: updatedByID,
                unlockReason: `CMS withdrawing rate ${latestRevision.rateCertificationName} from this submission`,
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

        // Validate that the rate to withdraw is on the now unlocked contract
        if (rateToWithdrawIndex === -1) {
            throw new UserInputPostgresError(
                `withdrawnRateID ${rateID} does not map to a current rate on this contract`
            )
        }

        // remove the rate to withdraw from previousRates. Removing it now prevents gaps in ratePosition.
        previousRates.splice(rateToWithdrawIndex, 1)

        previousRates.forEach((rate, idx) => {
            // keep any existing linked rates besides withdrawn rate
            if (rate.parentContractID !== contract.id) {
                linkRates.push({
                    rateID: rate.id,
                    ratePosition: idx + 1,
                })
            } else {
                // keep any existing child rates and resubmit them unchanged
                updateRates.push({
                    rateID: rate.id,
                    formData: rate.packageSubmissions[0].rateRevision.formData,
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

        // Resubmit contract if it was unlocked in this loop
        if (['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)) {
            const resubmitContractArgs: SubmitContractArgsType = {
                contractID: contract.id,
                submittedByUserID: updatedByID,
                submittedReason: `CMS has withdrawn rate ${latestRevision.rateCertificationName} from this submission`,
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
    await submitRateInsideTransaction(tx, {
        rateID,
        formData: undefined,
        submittedByUserID: updatedByID,
        submittedReason: 'CMS has withdrawn this rate',
    })

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
    client: PrismaClient,
    args: WithdrawRateArgsType
): Promise<RateType | Error> => {
    try {
        return await client.$transaction(async (tx) => {
            const withdrawResult = await withdrawRateInsideTransaction(tx, args)
            if (withdrawResult instanceof Error) {
                return withdrawResult
            }

            return withdrawResult
        })
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
