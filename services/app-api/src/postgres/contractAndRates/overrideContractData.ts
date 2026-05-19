import { parseErrorToError } from '@mc-review/helpers'
import type { ContractType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { findContractWithHistory } from './findContractWithHistory'

// Input shape for a single contract document override (used for both
// contractDocuments and supportingDocuments arrays).
//
// documentID null  => add a new doc on this revision; name, sha256, s3URL required.
// documentID set   => update an existing doc on this revision; only dateAdded
//                     may be overridden today (mirrors RateDocumentOverride).
type ContractDocumentOverrideInput = {
    documentID?: string | null
    name?: string | null
    sha256?: string | null
    s3URL?: string | null
    s3BucketName?: string | null
    s3Key?: string | null
    dateAdded?: Date | null
}

type OverrideContractDataArgsType = {
    contractID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
        revisionOverride?: {
            contractType?: 'BASE' | 'AMENDMENT' | null
            contractDocuments?: ContractDocumentOverrideInput[]
            supportingDocuments?: ContractDocumentOverrideInput[]
        }
    }
}

// Validates add-path requireds and update-path restrictions on a document
// override input array. Returns an Error describing the first invalid row,
// or undefined if all rows pass.
const validateContractDocumentOverrideInputs = (
    docs: ContractDocumentOverrideInput[],
    docKind: 'contractDocuments' | 'supportingDocuments'
): Error | undefined => {
    for (const [idx, doc] of docs.entries()) {
        if (doc.documentID == null) {
            // ADD path
            if (!doc.name || !doc.sha256 || !doc.s3URL) {
                return new Error(
                    `Invalid ${docKind} override at index ${idx}: when documentID is null (add path), name, sha256, and s3URL are required.`
                )
            }
        } else {
            // UPDATE path - only dateAdded overrideable today
            if (
                doc.name != null ||
                doc.sha256 != null ||
                doc.s3URL != null ||
                doc.s3BucketName != null ||
                doc.s3Key != null
            ) {
                return new Error(
                    `Invalid ${docKind} override at index ${idx}: when documentID is set (update path), only dateAdded may be overridden today; name, sha256, s3URL, s3BucketName, and s3Key must be null.`
                )
            }
        }
    }
    return undefined
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

    // Validate document override inputs before writing.
    if (revisionOverride?.contractDocuments) {
        const validationError = validateContractDocumentOverrideInputs(
            revisionOverride.contractDocuments,
            'contractDocuments'
        )
        if (validationError) {
            throw validationError
        }
    }
    if (revisionOverride?.supportingDocuments) {
        const validationError = validateContractDocumentOverrideInputs(
            revisionOverride.supportingDocuments,
            'supportingDocuments'
        )
        if (validationError) {
            throw validationError
        }
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
                          contractDocuments: revisionOverride.contractDocuments
                              ? {
                                    createMany: {
                                        data: revisionOverride.contractDocuments,
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
    type ContractDocumentOverrideInput,
}
