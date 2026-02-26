import type { ContractType, ContractRevisionType } from '../../domain-models'
import { contractSchema } from '../../domain-models/contractAndRates'
import type { ContractWithoutDraftRatesType } from '../../domain-models/contractAndRates/baseContractRateTypes'
import type { ContractPackageSubmissionType } from '../../domain-models'
import { rateWithoutDraftContractsToDomainModel } from './parseRateWithHistory'
import type { ContractRevisionTableWithFormData } from './prismaSharedContractRateHelpers'
import { getConsolidatedContractStatus } from './prismaSharedContractRateHelpers'
import {
    rateRevisionToDomainModel,
    unsortedRatesRevisionsToDomainModel,
} from './prismaSharedContractRateHelpers'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    getContractRateStatus,
    getContractReviewStatus,
    DRAFT_PARENT_PLACEHOLDER,
} from './prismaSharedContractRateHelpers'
import type { ContractTableWithoutDraftRates } from './prismaSubmittedContractHelpers'
import type { ContractTableFullPayload } from './prismaFullContractRateHelpers'
import type { ContractReviewActionType } from '../../domain-models/contractAndRates/contractReviewActionType'
import type { ContractDataOverrideType } from '../../domain-models/contractAndRates/contractRateOverrideTypes'

// This function might be generally useful later on. It takes an array of objects
// that can be errors and either returns the first error, or returns the list but with
// the assertion that none of the elements in the array are errors.
function arrayOrFirstError<T>(
    arrayWithPossibleErrors: (T | Error)[]
): T[] | Error {
    if (arrayWithPossibleErrors.every((i): i is T => !(i instanceof Error))) {
        return arrayWithPossibleErrors
    }

    const firstError = arrayWithPossibleErrors.find(
        (t): t is Error => t instanceof Error
    )
    if (!firstError) {
        return Error(
            'Should Not Happen: something in the array was an error but we couldnt find it'
        )
    }

    return firstError
}

// parseContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
function parseContractWithHistory(
    contract: ContractTableFullPayload,
    useZod: boolean = true
): ContractType | Error {
    const contractWithHistory = contractWithHistoryToDomainModel(contract)
    if (contractWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma contract with history failed: ${contractWithHistory.message}`
        )
        return contractWithHistory
    }

    // useZod flag allows us to skip parsing in parts of the code
    // where converting to the domain model is enough
    // such as when calling indexContract and indexRates
    if (useZod) {
        const parseContract = contractSchema.safeParse(contractWithHistory)
        if (!parseContract.success) {
            const error = `ERROR: attempting to parse prisma contract with history failed: ${parseContract.error}`
            console.warn(error, contractWithHistory, parseContract.error)
            return parseContract.error
        }

        return parseContract.data
    } else {
        return contractWithHistory
    }
}

function contractRevisionToDomainModel(
    revision: ContractRevisionTableWithFormData
): ContractRevisionType {
    return {
        id: revision.id,
        contract: revision.contract,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),

        formData: contractFormDataToDomainModel(revision),
    }
}

function contractOverridesToDomainModel(
    contractOverrides: ContractTableWithoutDraftRates['contractOverrides']
): ContractDataOverrideType[] {
    return contractOverrides
        .map((override) => ({
            id: override.id,
            createdAt: override.createdAt,
            updatedBy: override.updatedBy
                ? {
                      id: override.updatedBy.id,
                      role: override.updatedBy.role,
                      email: override.updatedBy.email,
                      givenName: override.updatedBy.givenName,
                      familyName: override.updatedBy.familyName,
                  }
                : undefined,
            description: override.description,
            overrides: {
                initiallySubmittedAt:
                    override.initiallySubmittedAt ?? undefined,
            },
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// contractWithHistoryToDomainModelWithoutRates constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates, but eliding any draft rates to break the recursion chain.
function contractWithHistoryToDomainModelWithoutRates(
    contract: ContractTableWithoutDraftRates
): ContractWithoutDraftRatesType | Error {
    // We iterate through each contract revision in order, adding it as a revision in the history
    // then iterate through each of its rates, constructing a history of any rates that changed
    // between contract revision updates
    const contractRevisions = contract.revisions
    const contractActions = contract.reviewStatusActions
    let draftRevision: ContractRevisionType | undefined = undefined
    const submittedRevisions: ContractRevisionType[] = []
    const reviewStatusActions: ContractReviewActionType[] = []

    for (const action of contractActions) {
        const contractAction = {
            dateApprovalReleasedToState:
                action.dateApprovalReleasedToState ?? undefined,
            actionType: action.actionType,
            contractID: action.contractID,
            updatedAt: action.updatedAt,
            updatedBy: action.updatedBy
                ? {
                      email: action.updatedBy.email,
                      familyName: action.updatedBy.familyName,
                      givenName: action.updatedBy.givenName,
                      role: action.updatedBy.role,
                  }
                : undefined,
            updatedReason: action.updatedReason ?? undefined,
        }
        reviewStatusActions.push(contractAction)
    }

    for (const contractRev of contractRevisions) {
        // If we have a draft revision
        // We set the draft revision aside, format it properly
        if (!contractRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a contract may not have multiple drafts simultaneously. ID: ' +
                        contract.id
                )
            }

            draftRevision = contractRevisionToDomainModel(contractRev)
            // skip the rest of the processing
            continue
        }
        submittedRevisions.push(contractRevisionToDomainModel(contractRev))
    }

    // Every revision has a set of submissions it was part of.
    const packageSubmissions: ContractPackageSubmissionType[] = []
    for (const revision of contract.revisions) {
        for (const submission of revision.relatedSubmisions) {
            // submittedThings
            const submittedContract = submission.submittedContracts.map((c) =>
                contractRevisionToDomainModel(c)
            )
            const submittedRates = submission.submittedRates.map((r) =>
                rateRevisionToDomainModel(r)
            )

            const submitedRevs: ContractPackageSubmissionType['submittedRevisions'] =
                []
            for (const contractRev of submittedContract) {
                submitedRevs.push(contractRev)
            }
            for (const rateRev of submittedRates) {
                submitedRevs.push(rateRev)
            }

            const relatedRateRevisions = submission.submissionPackages
                .filter((p) => p.contractRevisionID === revision.id)
                .sort((a, b) => a.ratePosition - b.ratePosition)
                .map((p) => p.rateRevision)

            const rateRevisions =
                unsortedRatesRevisionsToDomainModel(relatedRateRevisions)

            packageSubmissions.push({
                submitInfo: {
                    updatedAt: submission.updatedAt,
                    updatedBy: submission.updatedBy,
                    updatedReason: submission.updatedReason,
                },
                submittedRevisions: submitedRevs,
                contractRevision: contractRevisionToDomainModel(revision),
                rateRevisions: rateRevisions,
            })
        }
    }

    const status = getContractRateStatus(contract.revisions)
    const reviewStatus = getContractReviewStatus(contract.reviewStatusActions)
    const consolidatedStatus = getConsolidatedContractStatus(
        status,
        reviewStatus
    )

    return {
        id: contract.id,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        mccrsID: contract.mccrsID || undefined,
        status,
        reviewStatus,
        consolidatedStatus,
        reviewStatusActions: reviewStatusActions.reverse(),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        contractSubmissionType: contract.contractSubmissionType,
        draftRevision,
        revisions: submittedRevisions.reverse(),
        packageSubmissions: packageSubmissions.reverse(),
        contractOverrides: contractOverridesToDomainModel(
            contract.contractOverrides
        ),
    }
}

// contractWithHistoryToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates
function contractWithHistoryToDomainModel(
    contract: ContractTableFullPayload
): ContractType | Error {
    const contractWithoutRates =
        contractWithHistoryToDomainModelWithoutRates(contract)
    if (contractWithoutRates instanceof Error) {
        return contractWithoutRates
    }

    const withdrawnRatesOrErrors = contract.withdrawnRates.map((wr) =>
        rateWithoutDraftContractsToDomainModel(wr.rate)
    )

    const withdrawnRatesOrError = arrayOrFirstError(withdrawnRatesOrErrors)
    if (withdrawnRatesOrError instanceof Error) {
        return withdrawnRatesOrError
    }

    if (
        contractWithoutRates.status === 'SUBMITTED' ||
        contractWithoutRates.status === 'RESUBMITTED'
    ) {
        return {
            ...contractWithoutRates,
            withdrawnRates: withdrawnRatesOrError,
        }
    }

    // since we have a draft revision, we should also hold onto any set draftRates for later
    const draftRatesOrErrors = contract.draftRates.map((dr) =>
        rateWithoutDraftContractsToDomainModel(dr.rate)
    )

    const draftRatesOrError = arrayOrFirstError(draftRatesOrErrors)
    if (draftRatesOrError instanceof Error) {
        return draftRatesOrError
    }

    // FIX PARENT ID IF NEEDED
    // This is fragile code. Because of the asymmetry required to break the
    // draftRate/draftContract type-loop, we don't have the data required to
    // set parent id for a draft when parsing it. We fix it here.
    for (const draftRate of draftRatesOrError) {
        if (draftRate.parentContractID === DRAFT_PARENT_PLACEHOLDER) {
            draftRate.parentContractID = contractWithoutRates.id
        }
    }

    return {
        ...contractWithoutRates,
        withdrawnRates: withdrawnRatesOrError,
        draftRates: draftRatesOrError,
    }
}

export {
    parseContractWithHistory,
    contractRevisionToDomainModel,
    contractWithHistoryToDomainModel,
    contractWithHistoryToDomainModelWithoutRates,
    arrayOrFirstError,
}
