import type { ContractType } from '../../domain-models'
import { z } from 'zod'
import type {
    ArrayFieldOverrideOperation,
    ContractDocumentOverride,
    ContractType as PrismaContractType,
    ScalarFieldOverrideOperation,
} from '../../generated/client'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { findContractWithHistory } from './findContractWithHistory'
import {
    normalizeDocumentOverrideInputs,
    validateDocumentOverrideInputs,
    validateScalarOverrideInput,
} from '../prismaOverrideMergeHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { contractFormDataSchema } from '../../domain-models/contractAndRates/formDataTypes'

// NOTE on DocumentZipPackage: override creation does NOT regenerate or
// invalidate the stored zip for the submitted contract revision. Zips are
// only produced at lifecycle events (submit/resubmit, withdraw,
// undo-withdraw, or the standalone regenerate_zips handler).
//
// - Update-mode overrides (dateAdded only) don't change zip contents — no
//   issue.
// - Add-mode contractDocuments overrides introduce a doc that is NOT in
//   the stored zip. The merged form-data view includes it; the zip
//   download does not. This window-staleness is accepted in the current
//   implementation and resolves on the next unlock + resubmit cycle, when
//   overrides are materialized into real ContractDocument rows.
//
// See skills/skill-api/references/10-revision-overrides.md
// (Document Zip Packages And Overrides) for the full context.

type ContractDocumentOverrideInput = {
    documentOp: ArrayFieldOverrideOperation
    documentSha256: string
    documentID?: string | null
    name?: string | null
    sha256?: string | null
    s3URL?: string | null
    s3BucketName?: string | null
    s3Key?: string | null
    dateAddedOp?: ScalarFieldOverrideOperation | null
    dateAdded?: ContractDocumentOverride['dateAdded']
}

type OverrideContractDataArgsType = {
    contractID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
        initiallySubmittedAtOp?: ScalarFieldOverrideOperation | null
        revisionOverride?: {
            contractType?: PrismaContractType | null
            contractTypeOp?: ScalarFieldOverrideOperation | null
            contractDocuments?: ContractDocumentOverrideInput[]
            supportingDocuments?: ContractDocumentOverrideInput[]
        }
    }
}

const nonEmptyDocumentOverridesOrUndefined = (
    documents: ContractDocumentOverrideInput[] | undefined
) => (documents && documents.length > 0 ? documents : undefined)

const overrideContractDataInsideTransaction = async (
    tx: PrismaTransactionType,
    args: OverrideContractDataArgsType
): Promise<ContractType | Error> => {
    const { contractID, updatedByID, description, overrides } = args
    const { initiallySubmittedAt, initiallySubmittedAtOp, revisionOverride } =
        overrides

    const contractWithHistory = await findContractWithHistory(tx, contractID)

    if (!contractWithHistory || contractWithHistory instanceof Error) {
        const msg = contractWithHistory?.message
            ? contractWithHistory.message
            : `Contract with id ${contractID} not found.`
        throw new Error(msg)
    }

    const overridableContractStatuses = ['SUBMITTED', 'RESUBMITTED', 'APPROVED']

    if (
        !overridableContractStatuses.includes(
            contractWithHistory.consolidatedStatus
        )
    ) {
        throw new Error(
            `Cannot override data, contract consolidated status must be SUBMITTED, RESUBMITTED, or APPROVED. Consolidated status: ${contractWithHistory.consolidatedStatus}`
        )
    }

    const latestRevision =
        contractWithHistory.packageSubmissions[0]?.contractRevision

    if (!latestRevision) {
        throw new Error(
            `Could not find latest submitted contract revision for Contract with id ${contractID}.`
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

    const contractTypeValidation = validateScalarOverrideInput({
        fieldName: 'contractType',
        operation: revisionOverride?.contractTypeOp,
        value: revisionOverride?.contractType,
        valueSchema: contractFormDataSchema.shape.contractType,
    })
    if (contractTypeValidation) {
        throw contractTypeValidation
    }

    // normalize document arrays, empty arrays into undefines.
    let contractDocumentOverrides = nonEmptyDocumentOverridesOrUndefined(
        revisionOverride?.contractDocuments
    )
    let supportingDocumentOverrides = nonEmptyDocumentOverridesOrUndefined(
        revisionOverride?.supportingDocuments
    )

    // Validate document override inputs before writing.
    if (contractDocumentOverrides) {
        // latestRevision.formData is the effective document view and can include
        // override-added docs whose id is an override row id. documentID is a
        // base-table FK, so normalize non-base ids to null before writing.
        const baseContractDocumentIDs = new Set(
            (
                await tx.contractDocument.findMany({
                    where: { contractRevisionID: latestRevision.id },
                    select: { id: true },
                })
            ).map((doc) => doc.id)
        )
        contractDocumentOverrides = normalizeDocumentOverrideInputs({
            overrideDocs: contractDocumentOverrides,
            effectiveDocs: latestRevision.formData.contractDocuments,
            baseDocumentIDs: baseContractDocumentIDs,
        })
        const validationError = validateDocumentOverrideInputs({
            overrideDocs: contractDocumentOverrides,
            effectiveDocs: latestRevision.formData.contractDocuments,
            baseDocumentIDs: baseContractDocumentIDs,
            documentType: 'CONTRACT_DOCUMENTS',
            valueSchemas: { dateAdded: z.date() },
        })
        if (validationError) {
            throw validationError
        }
    }
    if (supportingDocumentOverrides) {
        // See contractDocuments above: documentID may only be written when it
        // references a stored base document row.
        const baseSupportingDocumentIDs = new Set(
            (
                await tx.contractSupportingDocument.findMany({
                    where: { contractRevisionID: latestRevision.id },
                    select: { id: true },
                })
            ).map((doc) => doc.id)
        )
        supportingDocumentOverrides = normalizeDocumentOverrideInputs({
            overrideDocs: supportingDocumentOverrides,
            effectiveDocs: latestRevision.formData.supportingDocuments,
            baseDocumentIDs: baseSupportingDocumentIDs,
        })
        const validationError = validateDocumentOverrideInputs({
            overrideDocs: supportingDocumentOverrides,
            effectiveDocs: latestRevision.formData.supportingDocuments,
            baseDocumentIDs: baseSupportingDocumentIDs,
            documentType: 'CONTRACT_SUPPORTING_DOCUMENTS',
            valueSchemas: { dateAdded: z.date() },
        })
        if (validationError) {
            throw validationError
        }
    }

    const contractOverride = await tx.contractOverrides.create({
        data: {
            contractID,
            updatedByID,
            description,
            initiallySubmittedAt: initiallySubmittedAt ?? null,
            initiallySubmittedAtOp: initiallySubmittedAtOp ?? null,
            revisionOverride: revisionOverride
                ? {
                      create: {
                          contractRevision: {
                              connect: {
                                  id: latestRevision.id,
                              },
                          },
                          contractType: revisionOverride.contractType ?? null,
                          contractTypeOp:
                              revisionOverride.contractTypeOp ?? null,
                          contractDocuments: contractDocumentOverrides
                              ? {
                                    createMany: {
                                        data: contractDocumentOverrides,
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

    // Contract overrides update the lastActionDate so users can see data has
    // changed.
    await tx.contractTable.update({
        where: {
            id: contractID,
        },
        data: {
            lastActionDate: contractOverride.createdAt,
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
    return runTransactionWithRowLock({
        client,
        operationName: 'overrideContractData',
        table: 'ContractTable',
        id: args.contractID,
        transaction: (tx) => overrideContractDataInsideTransaction(tx, args),
    })
}

export {
    overrideContractData,
    overrideContractDataInsideTransaction,
    type OverrideContractDataArgsType,
    type ContractDocumentOverrideInput,
}
