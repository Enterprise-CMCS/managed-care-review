import { parseErrorToError } from '@mc-review/helpers'
import type { ContractType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { findContractWithHistory } from './findContractWithHistory'

type OverrideContractDataArgsType = {
    contractID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
        revisionOverride?: {
            contractType?: 'BASE' | 'AMENDMENT' | null
        }
    }
}

const overrideContractDataInsideTransaction = async (
    tx: PrismaTransactionType,
    args: OverrideContractDataArgsType
): Promise<ContractType | Error> => {
    const { contractID, updatedByID, description, overrides } = args
    const { initiallySubmittedAt, revisionOverride } = overrides

    const contractWithHistory = await findContractWithHistory(tx, contractID)

    if (!contractWithHistory || contractWithHistory instanceof Error) {
        const msg = contractWithHistory?.message
            ? contractWithHistory.message
            : `Contract with id ${contractID} not found.`
        throw new Error(msg)
    }

    if (
        !['SUBMITTED', 'RESUBMITTED'].includes(
            contractWithHistory.consolidatedStatus
        )
    ) {
        throw new Error(
            `Cannot override data, contract consolidated status must be SUBMITTED or RESUBMITTED. Consolidated status: ${contractWithHistory.consolidatedStatus}`
        )
    }

    const latestRevision =
        contractWithHistory.packageSubmissions[0]?.contractRevision

    if (!latestRevision) {
        throw new Error(
            `Could not find latest submitted contract revision for Contract with id ${contractID}.`
        )
    }

    await tx.contractOverrides.create({
        data: {
            contractID,
            updatedByID,
            description,
            initiallySubmittedAt: initiallySubmittedAt ?? null,
            revisionOverride: revisionOverride
                ? {
                      create: {
                          contractRevision: {
                              connect: {
                                  id: latestRevision.id,
                              },
                          },
                          contractType: revisionOverride.contractType ?? null,
                      },
                  }
                : undefined,
        },
    })

    const overriddenContract = await findContractWithHistory(tx, contractID)

    if (!overriddenContract || overriddenContract instanceof Error) {
        const msg = overriddenContract?.message
            ? overriddenContract.message
            : `Contract with id ${contractID} not found.`

        throw new Error(
            `Error fetching contract after adding overrides. Message: ${msg}. Reverting overrides.`
        )
    }

    return overriddenContract
}

const overrideContractData = async (
    client: ExtendedPrismaClient,
    args: OverrideContractDataArgsType
): Promise<ContractType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await overrideContractDataInsideTransaction(tx, args)
        )
    } catch (err) {
        console.error('PRISMA ERROR: Error overriding contract data', err)
        return parseErrorToError(err)
    }
}

export {
    overrideContractData,
    overrideContractDataInsideTransaction,
    type OverrideContractDataArgsType,
}
