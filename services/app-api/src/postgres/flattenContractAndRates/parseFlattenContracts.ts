import type {
    FlattenContractType,
    FlattenRateType,
} from '../../domain-models/flattenContractAndRateTypes/flattenContractTypes'
import type { FlattenContractTablePayload } from './prismaFlattenContractHelpers'
import type { RateReviewStatusType } from '../../domain-models/contractAndRates/baseContractRateTypes'
import type { ProgramType } from '../../domain-models/ProgramType'
import {
    getContractRateStatus,
    getContractReviewStatus,
    getConsolidatedContractStatus,
    getConsolidatedRateStatus,
    convertUpdateInfoToDomainModel,
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
} from '../contractAndRates/prismaSharedContractRateHelpers'
import { packageName } from '@mc-review/submissions'
import { findStatePrograms } from '../state'

// parseFlattenContracts transforms a list of Prisma contract payloads into
// FlattenContractType[]. Each revision of a contract produces one flattened
// row with its associated rate revisions.
function parseFlattenContracts(
    contracts: FlattenContractTablePayload[]
): FlattenContractType[] | Error {
    const flattenedContracts: FlattenContractType[] = []

    for (const contract of contracts) {
        const result = parseSingleFlattenContract(contract)
        if (result instanceof Error) {
            return result
        }
        flattenedContracts.push(...result)
    }

    return flattenedContracts
}

// Shared contract-level computed fields used by both parse functions.
function getContractComputedFields(contract: FlattenContractTablePayload) {
    const status = getContractRateStatus(contract.revisions)
    const reviewStatus = getContractReviewStatus(contract.reviewStatusActions)
    const consolidatedStatus = getConsolidatedContractStatus(
        status,
        reviewStatus
    )

    const latestOverride = contract.contractOverrides[0]
    const firstSubmittedRevision = [...contract.revisions]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .find((r) => r.submitInfo)
    const initiallySubmittedAt =
        latestOverride?.initiallySubmittedAt ??
        firstSubmittedRevision?.submitInfo?.updatedAt

    // Compute lastUpdatedForDisplay: most recent of unlock, submit, revision
    // update, contract update, or review status action date.
    // Mirrors genericContractResolver.lastUpdatedForDisplay logic.
    const latestRevision = [...contract.revisions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0]
    const lastSubmitted = latestRevision?.submitInfo?.updatedAt
    const lastUnlocked = latestRevision?.unlockInfo?.updatedAt
    const submitStatusDate =
        lastUnlocked ??
        lastSubmitted ??
        latestRevision?.updatedAt ??
        contract.updatedAt

    const latestReviewAction = [...contract.reviewStatusActions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0]
    const lastUpdatedForDisplay =
        latestReviewAction && latestReviewAction.updatedAt > submitStatusDate
            ? latestReviewAction.updatedAt
            : submitStatusDate

    return {
        status,
        reviewStatus,
        consolidatedStatus,
        initiallySubmittedAt,
        lastUpdatedForDisplay,
    }
}

// Converts a single contract revision into a FlattenContractType row.
function revisionToFlattenContract(
    contract: FlattenContractTablePayload,
    revision: FlattenContractTablePayload['revisions'][0],
    computed: ReturnType<typeof getContractComputedFields>,
    statePrograms: ProgramType[]
): FlattenContractType | Error {
    const formData = contractFormDataToDomainModel(revision)
    const submitInfo = convertUpdateInfoToDomainModel(revision.submitInfo)
    const unlockInfo = convertUpdateInfoToDomainModel(revision.unlockInfo)

    const submissionID = packageName(
        contract.stateCode,
        contract.stateNumber,
        revision.programIDs,
        statePrograms
    )

    const rateRevisions = parseFlattenRateRevisions(contract, revision)
    if (rateRevisions instanceof Error) {
        return rateRevisions
    }

    return {
        // Contract-level fields
        contractId: contract.id,
        submissionID,
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        contractSubmissionType: contract.contractSubmissionType,
        mccrsID: contract.mccrsID || undefined,
        status: computed.status,
        reviewStatus: computed.reviewStatus,
        consolidatedStatus: computed.consolidatedStatus,
        contractCreatedAt: contract.createdAt,
        contractUpdatedAt: contract.updatedAt,
        initiallySubmittedAt:
            computed.initiallySubmittedAt ?? contract.createdAt,
        lastUpdatedForDisplay: computed.lastUpdatedForDisplay,

        // Revision-level fields
        revisionId: revision.id,
        revisionCreatedAt: revision.createdAt,
        revisionUpdatedAt: revision.updatedAt,

        // Flattened submitInfo
        submitInfoUpdatedAt: submitInfo?.updatedAt,
        submitInfoUpdatedByRole: submitInfo?.updatedBy.role,
        submitInfoUpdatedByEmail: submitInfo?.updatedBy.email,
        submitInfoUpdatedByGivenName: submitInfo?.updatedBy.givenName,
        submitInfoUpdatedByFamilyName: submitInfo?.updatedBy.familyName,
        submitInfoUpdatedReason: submitInfo?.updatedReason,

        // Flattened unlockInfo
        unlockInfoUpdatedAt: unlockInfo?.updatedAt,
        unlockInfoUpdatedByRole: unlockInfo?.updatedBy.role,
        unlockInfoUpdatedByEmail: unlockInfo?.updatedBy.email,
        unlockInfoUpdatedByGivenName: unlockInfo?.updatedBy.givenName,
        unlockInfoUpdatedByFamilyName: unlockInfo?.updatedBy.familyName,
        unlockInfoUpdatedReason: unlockInfo?.updatedReason,

        // Form data fields
        ...formData,

        // Strip nested fields
        contractDocuments: (formData.contractDocuments ?? []).map((d) => ({
            id: d.id,
            name: d.name,
        })),
        supportingDocuments: (formData.supportingDocuments ?? []).map((d) => ({
            id: d.id,
            name: d.name,
        })),
        stateContacts: (formData.stateContacts ?? []).map((c) => ({
            email: c.email,
        })),

        // Associated rate revisions
        rateRevisions,
    }
}

// Returns all revisions for each contract as flattened rows.
function parseSingleFlattenContract(
    contract: FlattenContractTablePayload
): FlattenContractType[] | Error {
    const computed = getContractComputedFields(contract)

    const statePrograms = findStatePrograms(contract.stateCode)
    if (statePrograms instanceof Error) {
        return statePrograms
    }

    const flattenedRows: FlattenContractType[] = []
    for (const revision of contract.revisions) {
        const result = revisionToFlattenContract(
            contract,
            revision,
            computed,
            statePrograms
        )
        if (result instanceof Error) {
            return result
        }
        flattenedRows.push(result)
    }

    return flattenedRows
}

// Returns only the latest submitted revision for a contract as a single
// flattened row. Returns undefined if the contract has no submitted revisions.
function parseLatestFlattenContract(
    contract: FlattenContractTablePayload
): FlattenContractType | undefined | Error {
    const computed = getContractComputedFields(contract)

    const statePrograms = findStatePrograms(contract.stateCode)
    if (statePrograms instanceof Error) {
        return statePrograms
    }

    // Find the latest submitted revision (revisions are ordered asc by createdAt)
    const latestSubmittedRevision = [...contract.revisions]
        .reverse()
        .find((r) => r.submitInfo)

    if (!latestSubmittedRevision) {
        return undefined
    }

    return revisionToFlattenContract(
        contract,
        latestSubmittedRevision,
        computed,
        statePrograms
    )
}

function parseFlattenRateRevisions(
    contract: FlattenContractTablePayload,
    revision: FlattenContractTablePayload['revisions'][0]
): FlattenRateType[] | Error {
    // Get the latest related submission for this revision
    const latestSubmission =
        revision.relatedSubmisions[revision.relatedSubmisions.length - 1]

    if (!latestSubmission) {
        return []
    }

    // Filter submission packages for this contract revision and get rate revisions
    const ratePackages = latestSubmission.submissionPackages
        .filter((pkg) => pkg.contractRevisionID === revision.id)
        .sort((a, b) => a.ratePosition - b.ratePosition)

    const flatRates: FlattenRateType[] = []

    for (const pkg of ratePackages) {
        const rateRevision = pkg.rateRevision
        const rate = rateRevision.rate

        const rateStatus = getContractRateStatus([rateRevision])
        // Compute rate review status from actions directly since our
        // lighter payload doesn't match the full RateTable types.
        const rateActions = [...rate.reviewStatusActions].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        )
        const rateReviewStatus: RateReviewStatusType =
            rateActions[0]?.actionType === 'WITHDRAW'
                ? 'WITHDRAWN'
                : 'UNDER_REVIEW'
        const rateConsolidatedStatus = getConsolidatedRateStatus(
            rateStatus,
            rateReviewStatus
        )

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
            packagesWithSharedRateCerts: _,
            ...rateFormDataWithoutPackages
        } = rateFormDataToDomainModel(rateRevision)
        const rateSubmitInfo = convertUpdateInfoToDomainModel(
            rateRevision.submitInfo
        )
        const rateUnlockInfo = convertUpdateInfoToDomainModel(
            rateRevision.unlockInfo
        )

        flatRates.push({
            // Rate-level fields
            rateId: rate.id,
            rateStateCode: rate.stateCode,
            rateStateNumber: rate.stateNumber,
            // The parent contract is the contract we're iterating since
            // rate revisions are fetched via its submission packages.
            parentContractID: contract.id,
            rateStatus,
            rateReviewStatus,
            rateConsolidatedStatus,
            rateCreatedAt: rate.createdAt,
            rateUpdatedAt: rate.updatedAt,

            // Rate revision-level fields
            rateRevisionId: rateRevision.id,
            rateRevisionCreatedAt: rateRevision.createdAt,
            rateRevisionUpdatedAt: rateRevision.updatedAt,

            // Flattened rate submitInfo
            rateSubmitInfoUpdatedAt: rateSubmitInfo?.updatedAt,
            rateSubmitInfoUpdatedByRole: rateSubmitInfo?.updatedBy.role,
            rateSubmitInfoUpdatedByEmail: rateSubmitInfo?.updatedBy.email,
            rateSubmitInfoUpdatedByGivenName:
                rateSubmitInfo?.updatedBy.givenName,
            rateSubmitInfoUpdatedByFamilyName:
                rateSubmitInfo?.updatedBy.familyName,
            rateSubmitInfoUpdatedReason: rateSubmitInfo?.updatedReason,

            // Flattened rate unlockInfo
            rateUnlockInfoUpdatedAt: rateUnlockInfo?.updatedAt,
            rateUnlockInfoUpdatedByRole: rateUnlockInfo?.updatedBy.role,
            rateUnlockInfoUpdatedByEmail: rateUnlockInfo?.updatedBy.email,
            rateUnlockInfoUpdatedByGivenName:
                rateUnlockInfo?.updatedBy.givenName,
            rateUnlockInfoUpdatedByFamilyName:
                rateUnlockInfo?.updatedBy.familyName,
            rateUnlockInfoUpdatedReason: rateUnlockInfo?.updatedReason,

            // Rate form data (packagesWithSharedRateCerts excluded)
            ...rateFormDataWithoutPackages,

            // Strip nested fields
            rateDocuments: (
                rateFormDataWithoutPackages.rateDocuments ?? []
            ).map((d) => ({
                id: d.id,
                name: d.name,
            })),
            supportingDocuments: (
                rateFormDataWithoutPackages.supportingDocuments ?? []
            ).map((d) => ({
                id: d.id,
                name: d.name,
            })),
            certifyingActuaryContacts: (
                rateFormDataWithoutPackages.certifyingActuaryContacts ?? []
            ).map((a) => ({
                id: a.id,
                email: a.email,
            })),
            addtlActuaryContacts: (
                rateFormDataWithoutPackages.addtlActuaryContacts ?? []
            ).map((a) => ({
                id: a.id,
                email: a.email,
            })),
        })
    }

    return flatRates
}

// Transforms a list of contracts, returning only the latest submitted
// revision per contract. Contracts with no submitted revisions are skipped.
function parseLatestFlattenContracts(
    contracts: FlattenContractTablePayload[]
): FlattenContractType[] | Error {
    const flattenedContracts: FlattenContractType[] = []

    for (const contract of contracts) {
        const result = parseLatestFlattenContract(contract)
        if (result instanceof Error) {
            return result
        }
        if (result) {
            flattenedContracts.push(result)
        }
    }

    return flattenedContracts
}

export {
    parseFlattenContracts,
    parseSingleFlattenContract,
    parseLatestFlattenContracts,
    parseLatestFlattenContract,
}
