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
import { includeRateRevisionWithRelatedSubmissionContracts } from './prismaSubmittedRateHelpers'
import { getNewParentContract } from './prismaSharedContractRateHelpers'
import type { RatesToReassign } from './reassignParentContract'
import { reassignParentContractInTransaction } from './reassignParentContract'

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
    const reassignParenContracts: {
        [key: string]: {
            rates: RatesToReassign[]
            contractStatus: ConsolidatedContractStatus
        }
    } = {}

    // Loop through all rates to determine which ones can be withdrawn or reassigned parent contract
    for (const rate of rates) {
        const latestRateRevision = rate.revisions[0]
        const submitInfo = latestRateRevision.submitInfo

        if (!submitInfo) {
            throw new Error(
                `Child rate ${rate.id} of contract to be withdrawn does is not submitted.`
            )
        }

        const parentContractID =
            latestRateRevision.submitInfo?.submittedContracts[0].contractID

        // skipping rate if conditions are met
        if (
            rate.reviewStatusActions[0]?.actionType === 'WITHDRAW' || // is the rate already withdrawn
            parentContractID !== contract.id // if it is a linked rate
        ) {
            continue
        }

        const reassignToContractID = getNewParentContract(
            parentContractID,
            latestRateRevision
        )

        // Reassign if there is a valid contract to reassign to, otherwise we set rate for withdraw
        if (reassignToContractID) {
            const { contractID, status } = reassignToContractID
            const reassignRate = {
                rateID: rate.id,
                rateName:
                    rate.revisions[0].rateCertificationName ?? 'Unknown Rate',
            }

            // if the contract exists in the dictionary, then add the rate to the array else add a new entry with rate and contract status
            if (!reassignParenContracts[contractID]) {
                reassignParenContracts[contractID] = {
                    rates: [],
                    contractStatus: status,
                }
            }
            reassignParenContracts[contractID].rates.push(reassignRate)
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

    const contractName = packageName(
        contract.stateCode,
        contract.stateNumber,
        latestContractRev.formData.programIDs,
        statePrograms
    )

    const withdrawRateNames = ratesToWithdraw.map(
        (r) => r.revisions[0]?.rateCertificationName ?? r.revisions[0].rateID
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

    // loop through the new parent contracts to assign its new child rates
    for (const [contractID, reassignmentData] of Object.entries(
        reassignParenContracts
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

    // fetch contract with history and validate withdraw
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
