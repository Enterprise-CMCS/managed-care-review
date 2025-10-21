import type { PrismaTransactionType } from '../prismaTypes'
import type { ConsolidatedContractStatus } from '../../gen/gqlClient'
import { includeStrippedRateWithoutDraftContracts } from './prismaSubmittedRateHelpers'
import { getParentContractID } from './prismaSharedContractRateHelpers'
import { unlockContractInsideTransaction } from './unlockContract'
import { submitContractAndOrRates } from './submitContractAndOrRates'
import type { ProgramType } from '../../domain-models'
import { packageName } from '@mc-review/submissions'

type RatesToReassign = {
    rateID: string
    rateName: string
}

type ReassignParenContractType = {
    contractID: string
    rates: RatesToReassign[]
    contractStatus: ConsolidatedContractStatus
    updatedByID: string
    statePrograms: ProgramType[]
}

/**
 * Reassigns rates to a parent contract with appropriate handling based on contract status.
 *
 * When reassigning rates to a SUBMITTED or APPROVED contract, we unlock this new parent contract to resubmit it with the rate
 * , so it becomes its child rate by sharing the same submitInfo.
 *
 * When reassigning rates to an UNLOCKED contract, we resubmit this contract with the rate,so it becomes its child rate by sharing
 * the same submitInfo. Then we unlock the contract again to restore it to its UNLOCKED state like we found it.
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param args - Configuration object containing parameters for reassignment
 * @param args.contractID - Unique identifier of the parent contract to reassign rates to
 * @param args.rates - Array of rate objects containing IDs and names to be reassigned
 * @param args.contractStatus - Current status of the parent contract (UNLOCKED, SUBMITTED, or APPROVED)
 * @param args.updatedByID - ID of the user performing the reassignment operation
 * @param args.statePrograms - Array of program types used for contract naming
 * @param tx
 * @param args
 */
const reassignParentContractInTransaction = async (
    tx: PrismaTransactionType,
    args: ReassignParenContractType
) => {
    const { contractID, rates, contractStatus, updatedByID, statePrograms } =
        args

    const rateIDs: string[] = []
    const rateNames: string[] = []

    rates.forEach((r) => {
        rateIDs.push(r.rateID)
        rateNames.push(r.rateName)
    })

    const errMsgPrefix = `Unable to reassign rates ${rateIDs.join(', ')}`
    let previousUnlockReason
    let contractName
    let draftRates = []

    if (contractStatus === 'UNLOCKED') {
        // We just want to get the current child rates, so we can submit the reassigned rates with it to become its children.
        const contractWithDraftRates = await tx.contractTable.findFirst({
            where: {
                id: contractID,
            },
            select: {
                stateCode: true,
                stateNumber: true,
                revisions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    select: {
                        unlockInfo: {
                            select: {
                                updatedReason: true,
                            },
                        },
                        submitInfo: {
                            select: {
                                updatedReason: true,
                            },
                        },
                        programIDs: true,
                    },
                    take: 1,
                },
                draftRates: {
                    orderBy: {
                        ratePosition: 'asc',
                    },
                    include: {
                        rate: {
                            include: {
                                ...includeStrippedRateWithoutDraftContracts,
                                reviewStatusActions: false,
                            },
                        },
                    },
                },
            },
        })

        if (!contractWithDraftRates) {
            throw new Error(
                `${errMsgPrefix}, contract ${contractID} not found.`
            )
        }

        if (!contractWithDraftRates?.draftRates) {
            throw new Error(
                `${errMsgPrefix}, contract ${contractID} has no draft rates.`
            )
        }

        const latestRevision = contractWithDraftRates.revisions[0]
        previousUnlockReason = latestRevision?.unlockInfo?.updatedReason
        contractName = packageName(
            contractWithDraftRates.stateCode,
            contractWithDraftRates.stateNumber,
            latestRevision.programIDs,
            statePrograms
        )

        draftRates = contractWithDraftRates.draftRates.map((dr) => ({
            ...dr.rate,
            parentContractID: getParentContractID(dr.rate.revisions),
        }))
    } else {
        // Unlock the contract, so we can resubmit it with the reassigned rate to become its child.
        const unlockedContract = await unlockContractInsideTransaction(tx, {
            contractID: contractID,
            unlockedByUserID: updatedByID,
            // this unlocked reason does not include contract name because new child rates are not sharing this unlockInfo
            // so no need to point the user to this contract.
            unlockReason: `CMS to reassign rate(s) ${rateNames.join(', ')} to be editable on this submission.`,
        })

        if (unlockedContract instanceof Error) {
            throw new Error(
                `${errMsgPrefix}, new parent Contract ${contractID} could not be unlocked. ${unlockedContract.message}`
            )
        }

        const latestRevision =
            unlockedContract.packageSubmissions[0].contractRevision

        contractName = packageName(
            unlockedContract.stateCode,
            unlockedContract.stateNumber,
            latestRevision.formData.programIDs,
            statePrograms
        )

        draftRates = unlockedContract.draftRates
    }

    // Collection of rates to submit with the contract. Draft rates includes linked rates that are not being reassigned and should not be submitted with the contract.
    const ratesToSubmit: string[] = []

    for (const draftRate of draftRates) {
        // filter out linked rates, except for the linked rates we want to reassign to this contract.
        if (
            draftRate.parentContractID === contractID ||
            rateIDs.includes(draftRate.id)
        ) {
            ratesToSubmit.push(draftRate.id)
        }
    }

    // resubmit the contract, so we create the submit info for the reassigned rate this will now be our marker in the
    // DB to identify the parent contract
    const resubmitContract = await submitContractAndOrRates(
        tx,
        contractID,
        ratesToSubmit,
        updatedByID,
        `CMS has reassigned rate(s) ${rateNames.join(', ')} to be editable on submission ${contractName}.`
    )

    if (resubmitContract instanceof Error) {
        throw new Error(
            `Unable to reassign rate(s) ${rateNames.join(', ')}, new parent Contract ${contractID} could not be resubmitted. ${resubmitContract.message}`
        )
    }

    // If this contract was originally unlocked, we want to put it back into that status with the new child rates.
    if (contractStatus === 'UNLOCKED') {
        const unlockedContract = await unlockContractInsideTransaction(tx, {
            contractID: contractID,
            unlockedByUserID: updatedByID,
            // This unlock includes contract name because the new child rates will share the same unlockInfo.
            unlockReason: `${previousUnlockReason}. CMS has reassigned rate(s) ${rateNames.join(', ')} to be editable on submission ${contractName}.`,
            // Adding 50ms to ensure this revision timestamp is later than the rate revision created for the old
            // parent contract. Needed for reliable sorting in revision history.
            manualCreatedAt: new Date(new Date().getTime() + 50),
        })

        if (unlockedContract instanceof Error) {
            throw new Error(
                `Unable to reassign rate(s) ${rateNames.join(', ')}, could not return new parent Contract ${contractID} to UNLOCKED status. ${unlockedContract.message}`
            )
        }
    }
}

export { reassignParentContractInTransaction }

export type { ReassignParenContractType, RatesToReassign }
