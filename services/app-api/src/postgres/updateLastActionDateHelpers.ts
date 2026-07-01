import type { PrismaTransactionType } from './prismaTypes'
import { findRateRelatedContractsInTransaction } from './contractAndRates/findRateRelatedContracts'

type NonEmptyArray<T> = [T, ...T[]]
type LastActionDateUpdateResult = {
    id: string
    lastActionDate: Date | null
}

/**
 * Confirms every expected record was updated to the exact timestamp passed by
 * the caller. This is used after bulk writes so a missing row or timestamp
 * mismatch fails loudly instead of silently leaving lastActionDate stale.
 *
 * @param recordType Label used in the thrown error message.
 * @param expectedIDs IDs that should have been updated.
 * @param updatedRecords Rows returned by the bulk update.
 * @param updatedAt Timestamp each row should now have as lastActionDate.
 */
function validateLastActionDateUpdates(
    recordType: 'contract' | 'rate',
    expectedIDs: string[],
    updatedRecords: LastActionDateUpdateResult[],
    updatedAt: Date
): void {
    const errorUpdating: {
        id: string
        issue: string
    }[] = []

    expectedIDs.forEach((id) => {
        const updatedResult = updatedRecords.find((record) => record.id === id)

        if (!updatedResult) {
            errorUpdating.push({
                id,
                issue: 'not_found',
            })
            return
        }

        if (updatedResult.lastActionDate?.getTime() !== updatedAt.getTime()) {
            errorUpdating.push({
                id,
                issue: 'last_action_date_mismatch',
            })
        }
    })

    if (errorUpdating.length > 0) {
        const formattedErrors = errorUpdating
            .map((error) => `${error.id}: ${error.issue}`)
            .join(', ')

        throw new Error(
            `Failed to update ${recordType} lastActionDate for all IDs. Expected ${expectedIDs.length}, updated ${updatedRecords.length}. Errors: ${formattedErrors}.`
        )
    }
}

/**
 * Narrows a dynamic array to the non-empty tuple type required by the
 * lastActionDate helpers. This keeps each caller responsible for deciding
 * whether an empty affected-record list is valid to skip or should be an error.
 *
 * @param items Dynamic array to check.
 * @returns True when the array has at least one item.
 */
function isNonEmptyArray<T>(items: T[]): items is NonEmptyArray<T> {
    return items.length > 0
}

/**
 * Bulk updates stored lastActionDate for one or more contracts and verifies
 * every requested contract row was updated.
 *
 * @param tx Prisma transaction/client used for the write.
 * @param contractIDs Non-empty contract ID list to update. Duplicates are ignored.
 * @param updatedAt Date to persist as the contract lastActionDate.
 */
async function updateContractsLastActionDate(
    tx: PrismaTransactionType,
    contractIDs: NonEmptyArray<string>,
    updatedAt: Date
): Promise<void> {
    // A contract can be discovered through multiple relationships, so de-dupe
    // before issuing the write.
    const uniqueIDs = [...new Set(contractIDs)]

    // Update lastActionDate on every affected contract and return the rows that matched.
    const updatedContracts = await tx.contractTable.updateManyAndReturn({
        where: {
            id: {
                in: uniqueIDs,
            },
        },
        data: {
            lastActionDate: updatedAt,
        },
        select: {
            id: true,
            lastActionDate: true,
        },
    })

    validateLastActionDateUpdates(
        'contract',
        uniqueIDs,
        updatedContracts,
        updatedAt
    )
}

/**
 * Updates the stored last action date for contracts currently related to a rate.
 *
 * Related contracts are resolved from the latest submitted package snapshot for
 * the rate. This is used when rate-visible data changes outside a contract
 * submit, such as rate overrides or rate Q&A. Draft-only links and previously
 * removed links are not updated.
 *
 * @param tx Prisma transaction/client used for relationship lookup and writes.
 * @param rateID Rate ID used to find currently related contracts.
 * @param updatedAt Date to persist as each related contract lastActionDate.
 */
async function updateRelatedContractsLastActionDateByRateID(
    tx: PrismaTransactionType,
    rateID: string,
    updatedAt: Date
): Promise<void> {
    const relatedContracts = await findRateRelatedContractsInTransaction(
        tx,
        rateID
    )
    const relatedContractIDs = relatedContracts.map((contract) => contract.id)

    if (!isNonEmptyArray(relatedContractIDs)) {
        throw new Error(
            `Cannot update related contract lastActionDate because rate ${rateID} has no related contracts`
        )
    }

    await updateContractsLastActionDate(tx, relatedContractIDs, updatedAt)
}

export { updateRelatedContractsLastActionDateByRateID }
