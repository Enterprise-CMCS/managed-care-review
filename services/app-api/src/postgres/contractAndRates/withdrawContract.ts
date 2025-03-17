import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models'
import { unlockContractInsideTransaction } from './unlockContract'
import { findStatePrograms } from '../state'
import { packageName } from '@mc-review/hpp'
import { submitContractInsideTransaction } from './submitContract'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'

export type WithdrawContractArgsType = {
    contract: ContractType
    updatedByID: string
    updatedReason: string
}

/**
 * Withdraws a contract and its associated eligible rates within a database transaction.
 *
 * This function performs the following operations:
 * 1. Identifies related rates that should be withdrawn with the contract
 * 2. Unlocks the contract and child rates with a withdrawal reason
 * 3. Resubmits the contract and child rates with a withdrawal reason
 * 4. Creates a withdrawal action for the contract
 * 5. Creates withdrawal actions for all eligible associated rates
 *
 * @async
 * @param {WithdrawContractArgsType} args - Withdrawal arguments
 * @param {ContractType} args.contract - The contract to withdraw
 * @param {string} args.updatedReason - The reason for withdrawal
 * @param {string} args.updatedByID - ID of the user performing the withdrawal
 *
 */
const withdrawContractInsideTransaction = async (
    tx: PrismaTransactionType,
    args: WithdrawContractArgsType
): Promise<ContractType | Error> => {
    performance.mark('beginWithdrawContractInsideTransaction')
    const { contract, updatedReason, updatedByID } = args

    const latestSubmission = contract.packageSubmissions[0]
    const latestContractRev = latestSubmission.contractRevision
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
                include: {
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
                    relatedSubmissions: {
                        orderBy: {
                            updatedAt: 'desc',
                        },
                        include: {
                            submissionPackages: {
                                include: {
                                    contractRevision: {
                                        select: {
                                            createdAt: true,
                                            contract: {
                                                select: {
                                                    id: true,
                                                    revisions: {
                                                        orderBy: {
                                                            updatedAt: 'desc',
                                                        },
                                                        take: 1,
                                                        select: {
                                                            unlockInfo: {
                                                                select: {
                                                                    id: true,
                                                                    updatedAt:
                                                                        true,
                                                                    updatedReason:
                                                                        true,
                                                                },
                                                            },
                                                            submitInfo: {
                                                                select: {
                                                                    id: true,
                                                                    updatedAt:
                                                                        true,
                                                                    updatedReason:
                                                                        true,
                                                                },
                                                            },
                                                        },
                                                    },
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
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        take: 1,
                    },
                },
            },
        },
    })

    if (!rates) {
        throw new NotFoundError('Could not find rates on contract')
    }

    // Child rates to withdraw with the submission, so it includes the same withdraw reason
    const ratesToWithdraw = []

    // loop through all rates to determine which ones can be withdrawn.
    for (const rate of rates) {
        // latest rate revision of the current rate on the submission
        const latestRateRevision = rate.revisions[0]
        // find the parent contract of the rate, it is the contract on the rates first submission revision
        const firstRateRevision = rate.revisions[rate.revisions.length - 1]
        const parentContractID =
            firstRateRevision.submitInfo?.submittedContracts[0].contractID

        // filter out submission packages that do not belong to this rate revision
        const submissionPackages =
            latestRateRevision.relatedSubmissions[0].submissionPackages
                .filter((p) => p.rateRevisionID === latestRateRevision.id)
                .sort(
                    (a, b) =>
                        b.contractRevision.createdAt.getTime() -
                        a.contractRevision.createdAt.getTime()
                )

        // get the parent contract data of this rate.
        const parentContract = submissionPackages?.find(
            (pkg) => pkg.contractRevision.contract.id === parentContractID
        )?.contractRevision.contract

        // check if any of the linked submissions are approved or submitted and not withdrawn
        const hasApprovedOrSubmittedSubs = submissionPackages.some((pkg) => {
            const reviewStatusAction =
                pkg.contractRevision.contract.reviewStatusActions[0]?.actionType
            const isSubmitted =
                pkg.contractRevision.contract.revisions[0].submitInfo

            // skip if this is the parent contract submission package.
            if (pkg.contractRevision.contract.id === contract.id) return false
            // is contract approved
            if (reviewStatusAction === 'MARK_AS_APPROVED') return true
            // is contract submitted and review status is not withdrawn
            if (isSubmitted && reviewStatusAction !== 'WITHDRAW') return true
            // otherwise does not meet condition
            return false
        })

        // skipping rate if conditions are met
        if (
            !latestRateRevision.submitInfo || // unlocked rate. linked rates can be in unlocked status
            rate.reviewStatusActions[0]?.actionType === 'WITHDRAW' || // is the rate already withdrawn
            hasApprovedOrSubmittedSubs || // any of the linked submissions are approved or submitted
            !parentContract // standalone rate could happen from a bug, old feature, or new feature. We don't want to withdraw these in this fashion.
        ) {
            continue
        }

        // TODO: Pending decision if rate can be withdrawn if its linked to a unlocked submission that had this rate in its latest submission package.
        //  - If we do allow it, then delete this TODO, if we do not allow it we need to add logic to check unlocked
        //      submissions for rate in its latest submission package.
        ratesToWithdraw.push(rate)
    }
    const statePrograms = findStatePrograms(contract.stateCode)

    if (statePrograms instanceof Error) {
        throw new Error(
            `State programs for stateCode ${contract.stateCode} not found.`
        )
    }

    const withdrawRateNames = ratesToWithdraw.map(
        (r) => r.revisions[0]?.rateCertificationName ?? r.revisions[0].rateID
    )
    const contractName = packageName(
        contract.stateCode,
        contract.stateNumber,
        latestContractRev.formData.programIDs,
        statePrograms
    )

    const rateNamesMessage =
        withdrawRateNames.length > 0
            ? ` along with the following rates: ${withdrawRateNames.join(', ')}`
            : ''

    // unlock contract with withdraw default message and withdraw input reason
    await unlockContractInsideTransaction(tx, {
        contractID: contract.id,
        unlockedByUserID: updatedByID,
        unlockReason: `CMS withdrawing the submission ${contractName}${rateNamesMessage}. ${updatedReason}`,
    })

    // resubmit contract with the default message and withdraw input reason
    await submitContractInsideTransaction(tx, {
        contractID: contract.id,
        submittedByUserID: updatedByID,
        submittedReason: `CMS has withdrawn the submission ${contractName}${rateNamesMessage}. ${updatedReason}`,
    })

    // add withdraw action to contract
    await tx.contractTable.update({
        where: {
            id: contract.id,
        },
        data: {
            reviewStatusActions: {
                create: {
                    updatedByID,
                    updatedReason,
                    actionType: 'WITHDRAW',
                },
            },
        },
    })

    // add withdraw action to all rates that are withdrawn with this submission
    for (const rate of ratesToWithdraw) {
        await tx.rateActionTable.create({
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
    }

    // fetch contract with history and return
    const withdrawnContract = await findContractWithHistory(tx, contract.id)

    if (withdrawnContract instanceof Error) {
        throw new Error(withdrawnContract.message)
    }

    if (withdrawnContract.consolidatedStatus !== 'WITHDRAWN') {
        throw new Error('contract failed to withdraw')
    }

    return withdrawnContract
}

const withdrawContract = async (
    client: ExtendedPrismaClient,
    args: WithdrawContractArgsType
): Promise<ContractType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await withdrawContractInsideTransaction(tx, args)
        )
    } catch (err) {
        const msg = `PRISMA ERROR: Error withdrawing contract: ${err.message}`
        console.error(msg)
        return err
    }
}

export { withdrawContractInsideTransaction, withdrawContract }
