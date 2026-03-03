import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findRateWithHistory } from './findRateWithHistory'

type OverrideRateDataArgsType = {
    rateID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
        revisionOverride?: {
            rateDocuments?: {
                documentID: string
                dateAdded?: Date | null
            }[]
            supportingDocuments?: {
                documentID: string
                dateAdded?: Date | null
            }[]
        }
    }
}

const overrideRateDataInsideTransaction = async (
    tx: PrismaTransactionType,
    args: OverrideRateDataArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, description, overrides } = args
    const { initiallySubmittedAt, revisionOverride } = overrides

    const rateWithHistory = await findRateWithHistory(tx, rateID)

    if (!rateWithHistory || rateWithHistory instanceof Error) {
        let msg = rateWithHistory.message
            ? rateWithHistory.message
            : `Rate with id ${rateID} not found.`
        throw new Error(msg)
    }

    if (
        !['SUBMITTED', 'RESUBMITTED'].includes(
            rateWithHistory.consolidatedStatus
        )
    ) {
        throw new Error(
            `Cannot override data, rate consolidated status must be SUBMITTED or RESUBMITTED. Consolidated status: ${rateWithHistory.consolidatedStatus}`
        )
    }

    const latestRevision = rateWithHistory.packageSubmissions[0].rateRevision

    if (!latestRevision) {
        throw new Error(
            `Could not find latest submitted rate revision for Rate with id ${rateID}.`
        )
    }

    await tx.rateOverrides.create({
        data: {
            rateID,
            updatedByID,
            description,
            initiallySubmittedAt: initiallySubmittedAt ?? null,
            revisionOverride: revisionOverride
                ? {
                      create: {
                          rateRevision: {
                              connect: {
                                  id: latestRevision.id,
                              },
                          },
                          rateDocuments: revisionOverride.rateDocuments
                              ? {
                                    createMany: {
                                        data: revisionOverride.rateDocuments,
                                    },
                                }
                              : undefined,
                          supportingDocuments:
                              revisionOverride.supportingDocuments
                                  ? {
                                        createMany: {
                                            data: revisionOverride.supportingDocuments,
                                        },
                                    }
                                  : undefined,
                      },
                  }
                : undefined,
        },
    })

    const overriddenRate = await findRateWithHistory(tx, rateID)

    if (!overriddenRate || overriddenRate instanceof Error) {
        let msg = overriddenRate.message
            ? overriddenRate.message
            : `Rate with id ${rateID} not found.`

        throw new Error(
            `Error fetching rate after adding overrides. Message: ${msg}. Reverting overrides.`
        )
    }

    return overriddenRate
}

const overrideRateData = async (
    client: ExtendedPrismaClient,
    args: OverrideRateDataArgsType
): Promise<RateType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await overrideRateDataInsideTransaction(tx, args)
        )
    } catch (err) {
        console.error('PRISMA ERROR: Error overriding rate data', err)
        return err
    }
}

export {
    overrideRateData,
    overrideRateDataInsideTransaction,
    type OverrideRateDataArgsType,
}
