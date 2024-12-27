import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import { findRateWithHistory } from './findRateWithHistory'
import type { PrismaClient } from '@prisma/client'
import { includeFullContract } from './prismaFullContractRateHelpers'
import {
    getConsolidatedContractStatus,
    getContractRateStatus,
    getContractReviewStatus,
    includeContractFormData,
} from './prismaSharedContractRateHelpers'
import { unlockContractInsideTransaction } from './unlockContract'
import { UserInputPostgresError } from '../postgresErrors'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'
import { updateDraftContractRatesInsideTransaction } from './updateDraftContractRates'
import type { SubmitContractArgsType } from './submitContract'
import { submitContractInsideTransaction } from './submitContract'
import { submitRateInsideTransaction } from './submitRate'

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
                                        include: includeContractFormData,
                                    },
                                },
                                orderBy: {
                                    ratePosition: 'desc',
                                },
                            },
                        },
                    },
                },
            },
        },
    })

    if (!rate) {
        throw new Error('Oh no')
    }

    // Get the contractIDs of the latest submission package of each related submission
    const latestRevision = rate.revisions[0]
    const contractIDs = latestRevision.relatedSubmissions.map(
        (sub) => sub.submissionPackages[0].contractRevision.contractID
    )

    //console.log(contractIDs)

    // get data for every contract
    const contracts = await tx.contractTable.findMany({
        where: {
            id: {
                in: contractIDs,
            },
        },
        include: includeFullContract,
    })

    // collect contractIDs we remove the rate from to make the new connection on the withdrawn rate table
    const withdrawnFromContracts: { contractID: string }[] = []

    // Remove rate from each contract
    for (const contract of contracts) {
        const consolidatedStatus = getConsolidatedContractStatus(
            getContractRateStatus(contract.revisions),
            getContractReviewStatus(contract)
        )

        // Any approved contracts returns an error to client
        if (consolidatedStatus === 'APPROVED') {
            return new Error(
                `Rate is a child or linked to an APPROVED contract with ID: ${contract.id}`
            )
        }

        // Draft and unlocked contracts are ignored, since other API will prevent them from resubmitting a withdrawn rate, breaking the link.
        if (['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)) {
            //contractsToUnlock.push(contract)

            const unlockedContract = await unlockContractInsideTransaction(tx, {
                contractID: contract.id,
                unlockedByUserID: updatedByID,
                unlockReason: `CMS withdrawing rate ${latestRevision.rateCertificationName} from this submission`,
            })

            if (unlockedContract instanceof Error) {
                return unlockedContract
            }

            const previousRates = unlockedContract.draftRates
            const rateToWithdrawIndex = previousRates
                .map((rate) => rate.id)
                .indexOf(rateID)

            // Validate that the rate to withdraw is on the now unlocked contract
            if (rateToWithdrawIndex === -1) {
                return new UserInputPostgresError(
                    `withdrawnRateID ${rateID} does not map to a current rate on this contract`
                )
            }

            const updateRates: UpdateDraftContractRatesArgsType['rateUpdates']['update'] =
                []
            const linkRates: UpdateDraftContractRatesArgsType['rateUpdates']['link'] =
                []

            // prepare rate data for updating
            previousRates.forEach((rate, idx) => {
                if (rate.id === rateID) {
                    return // we already know this is swapped, we will swap in replacement later, skip for now
                }
                // keep any existing linked rates besides replacement or withdrawn rate
                if (rate.parentContractID !== contract.id) {
                    linkRates.push({
                        rateID: rate.id,
                        ratePosition: idx + 1,
                    })
                } else {
                    // keep any existing child rates and resubmit them unchanged
                    updateRates.push({
                        rateID: rate.id,
                        formData:
                            rate.packageSubmissions[0].rateRevision.formData,
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
                    unlink: [
                        // unlink the withdrawn child rate
                        {
                            rateID: rateID,
                        },
                    ],
                    link: [
                        // keep any other already added linked rates
                        ...linkRates.sort(
                            (a, b) => a.ratePosition - b.ratePosition
                        ),
                    ],
                },
            }

            // update the contract to remove the withdrawn rate
            const updateResult =
                await updateDraftContractRatesInsideTransaction(
                    tx,
                    updateContractRatesArgs
                )

            if (updateResult instanceof Error) {
                return updateResult
            }

            // resubmit contract
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
                return resubmitResult
            }

            withdrawnFromContracts.push({ contractID: contract.id })
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
    try {
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
    } catch (err) {
        console.error('PRISMA ERROR: Error withdrawing rate', err)
        return new Error(err)
    }
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
