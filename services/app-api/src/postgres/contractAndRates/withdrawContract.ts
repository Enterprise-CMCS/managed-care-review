import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractType } from '../../domain-models'
import { unlockContractInsideTransaction } from './unlockContract'
import { findStatePrograms } from '../state'
import { packageName } from '@mc-review/hpp'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { ConsolidatedContractStatus } from '../../gen/gqlClient'
import { submitContractAndOrRates } from './submitContractAndOrRates'
import { includeRateWithoutDraftContracts } from './prismaSubmittedRateHelpers'
import { getParentContractID } from './prismaSharedContractRateHelpers'

export type WithdrawContractArgsType = {
    contract: ContractType
    updatedByID: string
    updatedReason: string
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
        throw new NotFoundError(
            'Could not find rates on contract to be withdrawn'
        )
    }

    // Child rates to withdraw with the submission, so it includes the same withdraw reason
    const ratesToWithdraw = []
    // Child rates that need to be reassigned a new parent contract
    const ratesToReAssign: {
        rateID: string
        rateName?: string
        reassignToContractID: string
        contractStatus: ConsolidatedContractStatus
    }[] = []

    // Loop through all rates to determine which ones can be withdrawn or reassigned parent contract
    for (const rate of rates) {
        // latest rate revision of the current rate on the submission
        const latestRateRevision = rate.revisions[0]
        // find the parent contract of the rate, it is the contract on the rates first submission revision

        if (!latestRateRevision.submitInfo) {
            throw new Error(
                `Child rate ${rate.id} of contract to be withdrawn does is not submitted.`
            )
        }

        const parentContractID =
            latestRateRevision.submitInfo?.submittedContracts[0].contractID

        // filter out submission packages that do not belong to this rate revision
        const submissionPackages =
            latestRateRevision.relatedSubmissions[0].submissionPackages
                .filter((p) => p.rateRevisionID === latestRateRevision.id)
                .sort(
                    (a, b) =>
                        b.contractRevision.createdAt.getTime() -
                        a.contractRevision.createdAt.getTime()
                )

        // skipping rate if conditions are met
        if (
            !latestRateRevision.submitInfo || // unlocked rate. linked rates can be in unlocked status
            rate.reviewStatusActions[0]?.actionType === 'WITHDRAW' || // is the rate already withdrawn
            parentContractID !== contract.id // if it is a linked rate
        ) {
            continue
        }

        // check if any of the linked submissions are approved or submitted and not withdrawn
        let reassignToContractID:
            | {
                  contractID: string
                  status: ConsolidatedContractStatus
              }
            | undefined = undefined

        // Looping through each rate's latest revision's related submissions to find a valid new parent contract.
        for (const pkg of submissionPackages) {
            const contractID = pkg.contractRevision.contract.id
            const latestRevision = pkg.contractRevision.contract.revisions[0]
            const isApproved =
                pkg.contractRevision.contract.reviewStatusActions[0]
                    ?.actionType === 'MARK_AS_APPROVED'
            const isWithdrawn =
                pkg.contractRevision.contract.reviewStatusActions[0]
                    ?.actionType === 'WITHDRAW'

            // Skip if this was the contract being withdrawn
            if (contractID === contract.id) {
                continue
            }

            // If withdrawn, skip to the next package
            if (isWithdrawn) {
                continue
            }
            // These next few conditionals are ordered by preferred contract status
            // Is submitted assigned new value
            if (latestRevision.submitInfo && !isApproved) {
                // contract with consolidated status of submitted is our preferred contract, break the loop if we find it.
                reassignToContractID = {
                    contractID,
                    status: 'SUBMITTED',
                }
                break
            }
            // Is unlocked
            if (
                !latestRevision.submitInfo &&
                latestRevision.unlockInfo &&
                !isApproved
            ) {
                // contract with consolidated status of submitted is our preferred contract, break the loop if we find it.
                reassignToContractID = {
                    contractID,
                    status: 'UNLOCKED',
                }
            }
            // Is approved and no reassigned contract is set, this is the least preferred contract.
            if (isApproved && !reassignToContractID) {
                reassignToContractID = {
                    contractID,
                    status: 'APPROVED',
                }
            }
        }

        // Reassign if there is a valid contract to reassign to, otherwise we set rate for withdraw
        if (reassignToContractID) {
            ratesToReAssign.push({
                rateID: rate.id,
                rateName: rate.revisions[0].rateCertificationName ?? undefined,
                reassignToContractID: reassignToContractID.contractID,
                contractStatus: reassignToContractID.status,
            })
        } else {
            ratesToWithdraw.push(rate)
        }
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
    const unlockContract = await unlockContractInsideTransaction(tx, {
        contractID: contract.id,
        unlockedByUserID: updatedByID,
        unlockReason: `CMS withdrawing the submission ${contractName}${rateNamesMessage}. ${updatedReason}`,
    })

    if (unlockContract instanceof Error) {
        throw new Error(
            `Cannot unlock contract to be withdrawn. ${unlockContract.message}`
        )
    }

    //NOTE: Consider a separate function to do the reassignment

    // Reassign rate to a new parent contract
    for (const reassignRate of ratesToReAssign) {
        const { rateID, reassignToContractID, rateName, contractStatus } =
            reassignRate

        let draftRates = []
        if (contractStatus === 'UNLOCKED') {
            // if this contract is already unlocked, we just want to get the current child rates, so we can submit the
            // reassigned rate with it ot become its child.
            const contractWithDraftRates = await tx.contractTable.findFirst({
                where: {
                    id: reassignToContractID,
                },
                select: {
                    draftRates: {
                        orderBy: {
                            ratePosition: 'asc',
                        },
                        include: {
                            rate: {
                                include: includeRateWithoutDraftContracts,
                            },
                        },
                    },
                },
            })

            if (!contractWithDraftRates) {
                throw new Error(
                    `Unable to reassign rate ${rateID}, contract ${reassignToContractID} not found.`
                )
            }

            if (!contractWithDraftRates?.draftRates) {
                throw new Error(
                    `Unable to reassign rate ${rateID}, contract ${reassignToContractID} has no draft rates.`
                )
            }

            draftRates = contractWithDraftRates.draftRates.map((dr) => ({
                ...dr.rate,
                parentContractID: getParentContractID(dr.rate.revisions),
            }))
        } else {
            // Unlock the contract, so we can resubmit it with the reassigned rate to become its child.
            const unlockedContract = await unlockContractInsideTransaction(tx, {
                contractID: reassignToContractID,
                unlockedByUserID: updatedByID,
                unlockReason: `CMS to reassign rate ${rateName} to be editable on this submission`,
            })

            if (unlockedContract instanceof Error) {
                throw new Error(
                    `Unable to reassign rate ${rateID}, new parent Contract ${reassignToContractID} could not be unlocked. ${unlockedContract.message}`
                )
            }

            draftRates = unlockedContract.draftRates
        }

        const ratesToSubmit: string[] = []

        // loop through draft rates as it will also contain linked rates that are also in draft
        for (const draftRate of draftRates) {
            // filter out linked rates, except for the one linked rate we want to reassign to this contract.
            if (
                draftRate.parentContractID === reassignToContractID ||
                draftRate.id === reassignRate.rateID // now include this rate we need to reassign
            ) {
                ratesToSubmit.push(draftRate.id)
            }
        }

        // resubmit the contract, so we create the submit info for the reassigned rate this will now be our marker in the
        // do to identify the parent contract
        const resubmitContract = await submitContractAndOrRates(
            tx,
            reassignToContractID,
            ratesToSubmit,
            updatedByID,
            `CMS reassigned rate ${rateName} to be editable on this submission`
        )

        if (resubmitContract instanceof Error) {
            throw new Error(
                `Unable to reassign rate ${rateID}, new parent Contract ${reassignToContractID} could not be resubmitted. ${resubmitContract.message}`
            )
        }

        // If this contract was originally unlocked, we want to put it back into that status with the new chil rate.
        if (contractStatus === 'UNLOCKED') {
            const unlockedContract = await unlockContractInsideTransaction(tx, {
                contractID: reassignToContractID,
                unlockedByUserID: updatedByID,
                unlockReason: `CMS to reassign rate ${rateName} to be editable on this submission`,
                // Adding 50ms to ensure this revision timestamp is later than the rate revision created for the old
                // parent contract. Needed for reliable sorting in revision history.
                manualCreatedAt: new Date(new Date().getTime() + 50),
            })

            if (unlockedContract instanceof Error) {
                throw new Error(
                    `Unable to reassign rate ${rateID}, could not return new parent Contract ${reassignToContractID} to UNLOCKED status. ${unlockedContract.message}`
                )
            }
        }
    }

    const resubmitWithdrawnContract = await submitContractAndOrRates(
        tx,
        contract.id,
        ratesToWithdraw.map((rate) => rate.id),
        updatedByID,
        `CMS has withdrawn the submission ${contractName}${rateNamesMessage}. ${updatedReason}`
    )

    if (resubmitWithdrawnContract instanceof Error) {
        throw new Error(
            `Could not resubmit contract to be withdrawn. ${resubmitWithdrawnContract.message}`
        )
    }

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
        throw new Error('Contract failed to withdraw')
    }

    return withdrawnContract
}

const withdrawContract = async (
    client: ExtendedPrismaClient,
    args: WithdrawContractArgsType
): Promise<ContractType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await withdrawContractInsideTransaction(tx, args),
            {
                timeout: 30000,
            }
        )
    } catch (err) {
        const msg = `PRISMA ERROR: Error withdrawing contract: ${err.message}`
        console.error(msg)
        return err
    }
}

export { withdrawContractInsideTransaction, withdrawContract }
