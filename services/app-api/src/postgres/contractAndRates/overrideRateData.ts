import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { z } from 'zod'
import type {
    ArrayFieldOverrideOperation,
    RateDocumentOverride,
    ScalarFieldOverrideOperation,
} from '../../generated/client'
import { findRateWithHistory } from './findRateWithHistory'
import {
    normalizeDocumentOverrideInputs,
    validateDocumentOverrideInputs,
    validateScalarOverrideInput,
} from '../prismaOverrideMergeHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { updateRelatedContractsLastActionDateByRateID } from '../updateLastActionDateHelpers'

type RateDocumentOverrideInput = {
    documentOp: ArrayFieldOverrideOperation
    documentSha256: string
    documentID?: string | null
    name?: string | null
    sha256?: string | null
    s3URL?: string | null
    s3BucketName?: string | null
    s3Key?: string | null
    dateAddedOp?: ScalarFieldOverrideOperation | null
    dateAdded?: RateDocumentOverride['dateAdded']
}

type OverrideRateDataArgsType = {
    rateID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
        initiallySubmittedAtOp?: ScalarFieldOverrideOperation | null
        revisionOverride?: {
            rateDocuments?: RateDocumentOverrideInput[]
            supportingDocuments?: RateDocumentOverrideInput[]
        }
    }
}

const nonEmptyDocumentOverridesOrUndefined = (
    documents: RateDocumentOverrideInput[] | undefined
) => (documents && documents.length > 0 ? documents : undefined)

const overrideRateDataInsideTransaction = async (
    tx: PrismaTransactionType,
    args: OverrideRateDataArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, description, overrides } = args
    const { initiallySubmittedAt, initiallySubmittedAtOp, revisionOverride } =
        overrides

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

    const initiallySubmittedAtValidation = validateScalarOverrideInput({
        fieldName: 'initiallySubmittedAt',
        operation: initiallySubmittedAtOp,
        value: initiallySubmittedAt,
        valueSchema: z.date(),
    })
    if (initiallySubmittedAtValidation) {
        throw initiallySubmittedAtValidation
    }

    let rateDocumentOverrides = nonEmptyDocumentOverridesOrUndefined(
        revisionOverride?.rateDocuments
    )
    let supportingDocumentOverrides = nonEmptyDocumentOverridesOrUndefined(
        revisionOverride?.supportingDocuments
    )

    if (rateDocumentOverrides) {
        // latestRevision.formData is the effective document view and can include
        // override-added docs whose id is an override row id. documentID is a
        // base-table FK, so normalize non-base ids to null before writing.
        const baseRateDocumentIDs = new Set(
            (
                await tx.rateDocument.findMany({
                    where: { rateRevisionID: latestRevision.id },
                    select: { id: true },
                })
            ).map((doc) => doc.id)
        )
        rateDocumentOverrides = normalizeDocumentOverrideInputs({
            overrideDocs: rateDocumentOverrides,
            effectiveDocs: latestRevision.formData.rateDocuments ?? [],
            baseDocumentIDs: baseRateDocumentIDs,
        })
        const validationError = validateDocumentOverrideInputs({
            overrideDocs: rateDocumentOverrides,
            effectiveDocs: latestRevision.formData.rateDocuments ?? [],
            baseDocumentIDs: baseRateDocumentIDs,
            documentType: 'RATE_DOCUMENTS',
            valueSchemas: { dateAdded: z.date() },
        })
        if (validationError) {
            throw validationError
        }
    }
    if (supportingDocumentOverrides) {
        // See rateDocuments above: documentID may only be written when it
        // references a stored base document row.
        const baseSupportingDocumentIDs = new Set(
            (
                await tx.rateSupportingDocument.findMany({
                    where: { rateRevisionID: latestRevision.id },
                    select: { id: true },
                })
            ).map((doc) => doc.id)
        )
        supportingDocumentOverrides = normalizeDocumentOverrideInputs({
            overrideDocs: supportingDocumentOverrides,
            effectiveDocs: latestRevision.formData.supportingDocuments ?? [],
            baseDocumentIDs: baseSupportingDocumentIDs,
        })
        const validationError = validateDocumentOverrideInputs({
            overrideDocs: supportingDocumentOverrides,
            effectiveDocs: latestRevision.formData.supportingDocuments ?? [],
            baseDocumentIDs: baseSupportingDocumentIDs,
            documentType: 'RATE_SUPPORTING_DOCUMENTS',
            valueSchemas: { dateAdded: z.date() },
        })
        if (validationError) {
            throw validationError
        }
    }

    const rateOverride = await tx.rateOverrides.create({
        data: {
            rateID,
            updatedByID,
            description,
            initiallySubmittedAt: initiallySubmittedAt ?? null,
            initiallySubmittedAtOp: initiallySubmittedAtOp ?? null,
            revisionOverride: revisionOverride
                ? {
                      create: {
                          rateRevision: {
                              connect: {
                                  id: latestRevision.id,
                              },
                          },
                          rateDocuments: rateDocumentOverrides
                              ? {
                                    createMany: {
                                        data: rateDocumentOverrides,
                                    },
                                }
                              : undefined,
                          supportingDocuments: supportingDocumentOverrides
                              ? {
                                    createMany: {
                                        data: supportingDocumentOverrides,
                                    },
                                }
                              : undefined,
                      },
                  }
                : undefined,
        },
    })

    // Rate overrides are submitted-data corrections visible on the rate
    // itself, so the rate action date should move to the override timestamp.
    await tx.rateTable.update({
        where: {
            id: rateID,
        },
        data: {
            lastActionDate: rateOverride.createdAt,
        },
    })

    // Rate overrides also change submitted rate data shown inside currently
    // related contracts, but they do not create contract package history.
    // Propagate the same action date to those contracts directly.
    await updateRelatedContractsLastActionDateByRateID(
        tx,
        rateID,
        rateOverride.createdAt
    )

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
    return runTransactionWithRowLock({
        client,
        operationName: 'overrideRateData',
        table: 'RateTable',
        id: args.rateID,
        transaction: (tx) => overrideRateDataInsideTransaction(tx, args),
    })
}

export {
    overrideRateData,
    overrideRateDataInsideTransaction,
    type OverrideRateDataArgsType,
    type RateDocumentOverrideInput,
}
