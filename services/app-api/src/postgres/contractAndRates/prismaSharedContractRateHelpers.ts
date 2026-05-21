import type {
    Prisma,
    ContractType,
    ContractDocument,
    ContractSupportingDocument,
    RateDocument,
    RateSupportingDocument,
} from '../../generated/client'
import type { ProgramType } from '../../domain-models'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    PackageStatusType,
    UpdateInfoType,
    ConsolidatedContractStatusType,
    DocumentType,
} from '../../domain-models/contractAndRates'
import { findStatePrograms } from '../state'
import { packageName } from '@mc-review/submissions'
import { logError } from '../../logger'
import type {
    ContractReviewStatusType,
    RateReviewStatusType,
} from '../../domain-models/contractAndRates/baseContractRateTypes'
import type {
    ContractTableWithoutDraftRates,
    ContractRevisionOverridesTablePayload,
} from './prismaSubmittedContractHelpers'
import type {
    HealthPlanPackageStatus,
    ContractReviewStatus,
    RateReviewStatus,
} from '../../gen/gqlServer'
import type {
    RateTableWithoutDraftContractsPayload,
    RateTableWithoutDraftContractsStrippedPayload,
    RateRevisionTableWithRelatedSubmissionContracts,
    RateTableWithRelatedContractsPayload,
    RateRevisionOverridesTablePayload,
} from './prismaSubmittedRateHelpers'
import type { ConsolidatedRateStatusType } from '../../domain-models/contractAndRates/statusType'
import type { RelatedContractStripped } from '../../gen/gqlServer'

const subincludeUpdateInfo = {
    updatedBy: true,
} satisfies Prisma.UpdateInfoTableInclude

const includeUpdateInfo = {
    include: subincludeUpdateInfo,
}

type UpdateInfoTableWithUpdater = Prisma.UpdateInfoTableGetPayload<{
    include: typeof subincludeUpdateInfo
}>

interface RevisionStatusInfo {
    id: string
    updatedAt: Date
    updatedReason: string
}

const DRAFT_PARENT_PLACEHOLDER = 'DRAFT_PARENT_REPLACE_ME'

const includeContractFormData = {
    unlockInfo: includeUpdateInfo,
    undoUnlockInfo: includeUpdateInfo,
    submitInfo: includeUpdateInfo,
    contract: true,

    stateContacts: {
        orderBy: {
            position: 'asc',
        },
    },
    contractDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    supportingDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    revisionOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            contractRevisionID: true,
            contractType: true,
            contractDocuments: true,
            supportingDocuments: true,
        },
    },
} satisfies Prisma.ContractRevisionTableInclude

// Lose type for validating revision state.
interface RevisionWithStatusInfo {
    createdAt: Date
    submitInfo?: RevisionStatusInfo | null
    unlockInfo?: RevisionStatusInfo | null
    undoUnlockInfo?: RevisionStatusInfo | null
}

function convertUpdateInfoToDomainModel(
    info?: UpdateInfoTableWithUpdater | null
): UpdateInfoType | undefined {
    if (!info) {
        return undefined
    }

    return {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedBy,
        updatedReason: info.updatedReason,
    }
}

// -----

// A reversed unlock revision will have undoUnlockInfo and unlockInfo
function isReversedUnlockedRevision(revision: RevisionWithStatusInfo): boolean {
    return (
        revision.unlockInfo != null &&
        revision.undoUnlockInfo != null &&
        revision.submitInfo == null
    )
}

// An unlocked revision will only have unlockInfo.
function isUnlockedRevision(revision: RevisionWithStatusInfo): boolean {
    return (
        revision.unlockInfo != null &&
        revision.submitInfo == null &&
        revision.undoUnlockInfo == null
    )
}

// A draft revision can be either the initial draft or an unlocked draft.
function isDraftRevision(revision: RevisionWithStatusInfo): boolean {
    return revision.submitInfo == null && revision.undoUnlockInfo == null
}

// A submitted revision will always have a submit info.
function isSubmittedRevision(revision: RevisionWithStatusInfo): boolean {
    return revision.submitInfo != null
}

/**
 * Returns the latest revision that should be treated as current.
 * Revisions that were unlocked and then undo unlocked are kept for history, but are not current.
 */
function getLatestActiveRevision<T extends RevisionWithStatusInfo>(
    revisions: T[]
): T | undefined {
    const revs = [...revisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )

    return revs.find((revision) => !isReversedUnlockedRevision(revision))
}

// -----
function getContractRateStatus(
    revisions: RevisionWithStatusInfo[]
): PackageStatusType {
    let latestRevision = getLatestActiveRevision(revisions)

    if (!latestRevision) {
        latestRevision = [...revisions].sort(
            (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
        )[0]

        if (latestRevision) {
            logError(
                'prismaSharedContractRateHelpers',
                'No active revision found when deriving contract/rate status; falling back to latest stored revision'
            )
        }
    }

    if (!latestRevision) {
        logError(
            'prismaSharedContractRateHelpers',
            'Cannot derive contract/rate status: no revisions found'
        )
        return 'DRAFT'
    }

    const submitInfo = latestRevision.submitInfo
    const unlockInfo = latestRevision.unlockInfo

    // If both info exists then it was resubmitted, you can only get an unlockInfo after the initial submit.
    if (submitInfo && unlockInfo) {
        return 'RESUBMITTED'
    }

    // If only unlock info exists, then it was never resubmitted,
    if (!submitInfo && unlockInfo) {
        return 'UNLOCKED'
    }

    // If only submitInfo exists, then it is the first submission as a first revision can never have a unlockInfo.
    if (submitInfo && !unlockInfo) {
        return 'SUBMITTED'
    }

    // If no submitInfo or unlockInfo we know this is a newly created contract with an initial revision.
    return 'DRAFT'
}

// -----
function getContractReviewStatus(
    reviewStatusActions: ContractTableWithoutDraftRates['reviewStatusActions']
): ContractReviewStatusType {
    // need to order actions from latest to earliest
    const actions = [...reviewStatusActions].sort(
        (actionA, actionB) =>
            actionB.updatedAt.getTime() - actionA.updatedAt.getTime()
    )
    const latestAction = actions[0]
    if (latestAction?.actionType === 'NOT_SUBJECT_TO_REVIEW') {
        return 'NOT_SUBJECT_TO_REVIEW'
    }
    if (latestAction?.actionType === 'MARK_AS_APPROVED') {
        return 'APPROVED'
    }
    if (latestAction?.actionType === 'WITHDRAW') {
        return 'WITHDRAWN'
    }
    return 'UNDER_REVIEW'
}

function getRateReviewStatus(
    rate:
        | RateTableWithoutDraftContractsPayload
        | RateTableWithoutDraftContractsStrippedPayload
): RateReviewStatusType {
    // need to order actions from latest to earliest
    const actions = [...rate.reviewStatusActions].sort(
        (actionA, actionB) =>
            actionB.updatedAt.getTime() - actionA.updatedAt.getTime()
    )
    const latestAction = actions[0]
    if (latestAction?.actionType === 'WITHDRAW') {
        return 'WITHDRAWN'
    }
    return 'UNDER_REVIEW'
}

// -----
function getConsolidatedContractStatus(
    status: HealthPlanPackageStatus,
    reviewStatus: ContractReviewStatus
): ConsolidatedContractStatusType {
    // UNDER_REVIEW is the default reviewStatus for a submission.
    // In the system, status only takes precedence for the consolidatedStatusField
    // if the reviewStatus hasn't been changed (i.e it's still set as UNDER_REVIEW).
    // However, if reviewStatus has been changed then reviewStatus takes precedence for the consolidatedStatus
    if (reviewStatus !== 'UNDER_REVIEW') {
        // UNLOCKED takes precedence over NOT_SUBJECT_TO_REVIEW.
        if (status === 'UNLOCKED' && reviewStatus === 'NOT_SUBJECT_TO_REVIEW') {
            return status
        }
        return reviewStatus
    } else {
        return status
    }
}

function getConsolidatedRateStatus(
    status: HealthPlanPackageStatus,
    reviewStatus: RateReviewStatus
): ConsolidatedRateStatusType {
    // UNDER_REVIEW is the default reviewStatus for a rate.
    // In the system, status only takes precedence for the consolidatedStatusField
    // if the reviewStatus hasn't been changed (i.e it's still set as UNDER_REVIEW).
    // However, if reviewStatus has been changed then reviewStatus takes precedence for the consolidatedStatus
    if (reviewStatus !== 'UNDER_REVIEW') {
        return reviewStatus
    } else {
        return status
    }
}

// Minimum required structure of a rate revision that contains parent contract relationship information.
interface RateRevisionWithSubmittedContracts {
    createdAt: Date
    submitInfo?: {
        submittedContracts: Array<{
            contractID: string
        }>
    } | null
    undoUnlockInfo?: unknown | null
    relatedSubmissions: Array<unknown>
}

// Find this rate's parent contract. It'll be the contract it was initially submitted with
// or the contract it is associated with as an initial draft.
const getParentContractID = (
    rateRevisions: RateRevisionWithSubmittedContracts[]
): string | Error => {
    // sort in descending order
    const revisions = [...rateRevisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const initialSubmission = revisions[revisions.length - 1].submitInfo

    if (!initialSubmission) {
        // this is a draft, never submitted, rate
        // this is fragile code
        // because this is a draft, it can only be parented by the single draft contract
        // that created it. But because of the asymmetry required to break the recursive
        // rate-draftContract bit, we don't have access to that here. Put a shibboleth in
        // that can be replaced in higher places.
        return DRAFT_PARENT_PLACEHOLDER
    }

    // Find the latest submitted revision with submitted contracts. For an independent withdrawn rate, it will find the
    // parent contract of the rate before it was withdrawn.
    const latestSubmittedRevision = revisions.find(
        (revision) => revision.submitInfo?.submittedContracts[0]
    )

    if (!latestSubmittedRevision?.submitInfo) {
        return new Error(
            'Could not find a submitted revision to get parent contract id.'
        )
    }

    if (latestSubmittedRevision.relatedSubmissions.length == 0) {
        console.info('No related submission. Unmigrated rate.')
        return '00000000-1111-2222-3333-444444444444'
    }

    // there should always only be one submitted contract at the revision level submit info
    const latestParentContract =
        latestSubmittedRevision.submitInfo.submittedContracts[0]

    if (!latestParentContract) {
        return new Error(
            'programming error: its a submitted rate that was not submitted with a contract initially'
        )
    }

    return latestParentContract.contractID
}

// Function to loop through a list of revisions on a rate and find a suitable parent contract. Meant to be used in cases where the original parent contract associated with that rate has been withdrawn but the rate is still linked to other contracts.
const getNewParentContract = (
    rateRevisions: RateRevisionTableWithRelatedSubmissionContracts[]
):
    | {
          contractID: string
          status: ConsolidatedContractStatusType
      }
    | undefined => {
    const latestRevision = getLatestActiveRevision(rateRevisions)

    if (!latestRevision?.submitInfo?.submittedContracts[0]) {
        return undefined
    }

    // find the current parent contract
    const currentContractID =
        latestRevision.submitInfo?.submittedContracts[0].contractID

    const submissionPackages =
        latestRevision.relatedSubmissions[0].submissionPackages
            .filter((p) => p.rateRevisionID === latestRevision.id)
            .sort(
                (a, b) =>
                    b.contractRevision.createdAt.getTime() -
                    a.contractRevision.createdAt.getTime()
            )

    let reassignToContract = undefined

    // Loop through the latest submission packages to find a new contract that is linked to this rate.
    for (const pkg of submissionPackages) {
        const newContractID = pkg.contractRevision.contract.id
        const reviewStatus = getContractReviewStatus(
            pkg.contractRevision.contract.reviewStatusActions
        )
        const contractStatus = getContractRateStatus(
            pkg.contractRevision.contract.revisions
        )
        const consolidatedStatus = getConsolidatedContractStatus(
            contractStatus,
            reviewStatus
        )

        // Skip if this was the contract being withdrawn or is withdrawn
        if (
            newContractID === currentContractID ||
            reviewStatus === 'WITHDRAWN'
        ) {
            continue
        }

        // These next few conditionals are ordered by preferred contract status
        if (['SUBMITTED', 'RESUBMITTED'].includes(consolidatedStatus)) {
            // contract with consolidated status of submitted is our preferred contract, break the loop if we find it.
            reassignToContract = {
                contractID: newContractID,
                status: contractStatus, // SUBMITTED includes resubmitted, there is no distinction here.
            }
            break
        }
        // Is unlocked and not approved
        if (consolidatedStatus === 'UNLOCKED') {
            reassignToContract = {
                contractID: newContractID,
                status: consolidatedStatus,
            }
        }
        // Is approved and no reassigned contract is set, this is the least preferred contract.
        if (consolidatedStatus === 'APPROVED' && !reassignToContract) {
            reassignToContract = {
                contractID: newContractID,
                status: consolidatedStatus,
            }
        }
    }

    return reassignToContract
}

// Loops though a stripped down rate to find the latest linked and parent contract of this rate.
const getRelatedContracts = (
    rate: RateTableWithRelatedContractsPayload
): RelatedContractStripped[] => {
    const revisions = [...rate.revisions].sort(
        (revA, revB) => revA.createdAt.getTime() - revB.createdAt.getTime()
    )

    let relatedContracts: RelatedContractStripped[] = []

    for (const rateRev of revisions) {
        if (!rateRev.submitInfo) {
            continue
        }

        // get the latest related submissions entry
        const latestRelatedSubmission = rateRev.relatedSubmissions[0]

        // collect related contracts with latest consolidated statuses
        const contracts: RelatedContractStripped[] = []

        // looping throw all the submission packages of the related submissions to find the contracts for this rate.
        latestRelatedSubmission.submissionPackages.forEach((pkg) => {
            if (pkg.rateRevisionID === rateRev.id) {
                const reviewStatus = getContractReviewStatus(
                    pkg.contractRevision.contract.reviewStatusActions
                )
                const contractStatus = getContractRateStatus(
                    pkg.contractRevision.contract.revisions
                )

                // Consolidate the statuses.
                const consolidatedStatus = getConsolidatedContractStatus(
                    contractStatus,
                    reviewStatus
                )

                // Add to our temporary array
                contracts.push({
                    id: pkg.contractRevision.contract.id,
                    consolidatedStatus,
                })
            }
        })

        // Set the related contracts array, replacing the previous with the current so that the result is related contracts from the latest submission.
        relatedContracts = contracts
    }

    return relatedContracts
}
// ------

const includeRateFormData = {
    submitInfo: includeUpdateInfo,
    unlockInfo: includeUpdateInfo,
    undoUnlockInfo: includeUpdateInfo,
    rate: true,

    rateDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    supportingDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    certifyingActuaryContacts: {
        orderBy: {
            position: 'asc',
        },
    },
    addtlActuaryContacts: {
        orderBy: {
            position: 'asc',
        },
    },
    contractsWithSharedRateRevision: {
        include: {
            revisions: {
                include: includeContractFormData,
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    },
    revisionOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            rateRevisionID: true,
            rateDocuments: true,
            supportingDocuments: true,
        },
    },
} satisfies Prisma.RateRevisionTableInclude

const includeStrippedRateFormData = {
    submitInfo: includeUpdateInfo,
    unlockInfo: includeUpdateInfo,
    undoUnlockInfo: includeUpdateInfo,
} satisfies Prisma.RateRevisionTableInclude

const includeStrippedContractFormData = {
    submitInfo: includeUpdateInfo,
    unlockInfo: includeUpdateInfo,
    undoUnlockInfo: includeUpdateInfo,
    contract: true,
    revisionOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            createdAt: true,
            contractRevisionID: true,
            contractType: true,
            // Selected so mergeContractRevisionOverrides has the expected
            // shape, even though the stripped view doesn't expose docs.
            contractDocuments: true,
            supportingDocuments: true,
        },
    },
} satisfies Prisma.ContractRevisionTableInclude

type RateRevisionTableWithFormData = Prisma.RateRevisionTableGetPayload<{
    include: typeof includeRateFormData
}>

type StrippedRateRevisionTableWithFormData =
    Prisma.RateRevisionTableGetPayload<{
        include: typeof includeStrippedRateFormData
    }>

type StrippedContractRevisionTableWithFormData =
    Prisma.ContractRevisionTableGetPayload<{
        include: typeof includeStrippedContractFormData
    }>

// Merges contract document overrides into the original document list for a
// single revision. Two override modes:
//   - update (documentID != null): sparse-patch the matching original doc with
//     non-null override fields, accumulated across all overrides on the
//     revision in createdAt-asc order (newer overrides win per field).
//   - add (documentID == null): synthesize as a new doc and append after the
//     existing list, ordered by override-row createdAt-asc.
//
// Add-rows are expected to have been validated upstream in overrideContractData
// such that name, sha256, s3URL are non-null.
const mergeContractDocumentOverrides = <
    T extends ContractDocument | ContractSupportingDocument,
>(
    originalDocs: T[],
    overrideRows: (
        | ContractRevisionOverridesTablePayload['contractDocuments'][number]
        | ContractRevisionOverridesTablePayload['supportingDocuments'][number]
    )[],
    contractRevisionID: string
): T[] => {
    // Process all overrides in createdAt-asc order so that newer overrides
    // override older ones on the same field (last write wins, per the skill's
    // sparse-patch convention).
    const ordered = [...overrideRows].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Accumulate update-patches by documentID; collect add-rows separately.
    const updatePatches = new Map<string, { dateAdded?: Date | null }>()
    const addRows: typeof ordered = []
    for (const row of ordered) {
        if (row.documentID == null) {
            addRows.push(row)
            continue
        }
        const patch = updatePatches.get(row.documentID) ?? {}
        if (row.dateAdded != null) {
            patch.dateAdded = row.dateAdded
        }
        // (Future overrideable fields would merge in here.)
        updatePatches.set(row.documentID, patch)
    }

    // Apply update-patches to the original docs, preserving order/position.
    const mergedOriginals: T[] = originalDocs.map((doc) => {
        const patch = updatePatches.get(doc.id)
        if (!patch) {
            return doc
        }
        return {
            ...doc,
            dateAdded: patch.dateAdded ?? doc.dateAdded,
        }
    })

    // Synthesize add-rows as new domain docs appended at the end. Position is
    // not exposed in the domain shape; only array order matters here. Position
    // is computed at unlock-time materialization, not at read time.
    const synthesized: T[] = addRows.map((row) => {
        const stamp = row.createdAt ?? new Date()
        return {
            id: row.id,
            createdAt: stamp,
            updatedAt: stamp,
            // position is required on the Prisma row type but not exposed in
            // the domain shape; assign a sentinel so the shape type-checks.
            position: -1,
            name: row.name as string,
            s3URL: row.s3URL as string,
            sha256: row.sha256 as string,
            s3BucketName: row.s3BucketName ?? null,
            s3Key: row.s3Key ?? null,
            dateAdded: row.dateAdded ?? null,
            contractRevisionID,
        } as T
    })

    return [...mergedOriginals, ...synthesized]
}

// Output of mergeContractRevisionOverrides: the effective merged result of
// all ContractRevisionOverrides rows on a single revision. Doc arrays are
// the raw override rows flat-mapped across all overrides; downstream
// helpers (mergeContractDocumentOverrides) handle per-documentID
// sparse-merging.
type MergedContractRevisionOverride = {
    contractType: ContractType | null
    contractDocuments: ContractRevisionOverridesTablePayload['contractDocuments']
    supportingDocuments: ContractRevisionOverridesTablePayload['supportingDocuments']
}

// Merges all ContractRevisionOverrides rows for a single revision into one
// effective result. Callers must pre-filter rows to the relevant revisionID.
//   - contractType: newer-wins (last non-null in createdAt-asc order)
//   - contractDocuments / supportingDocuments: raw override rows
//     flat-mapped across all overrides on the revision
const mergeContractRevisionOverrides = (
    revisionOverrideRows: ContractRevisionOverridesTablePayload[]
): MergedContractRevisionOverride => {
    const ordered = [...revisionOverrideRows].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    let contractType: ContractType | null = null
    const contractDocuments: MergedContractRevisionOverride['contractDocuments'] =
        []
    const supportingDocuments: MergedContractRevisionOverride['supportingDocuments'] =
        []

    for (const row of ordered) {
        if (row.contractType !== null) {
            contractType = row.contractType
        }
        contractDocuments.push(...row.contractDocuments)
        supportingDocuments.push(...row.supportingDocuments)
    }

    return { contractType, contractDocuments, supportingDocuments }
}

// Output of mergeRateRevisionOverrides: rate-side parallel. No top-level
// overrideable fields on RateRevisionOverrides today, just the doc arrays.
type MergedRateRevisionOverride = {
    rateDocuments: RateRevisionOverridesTablePayload['rateDocuments']
    supportingDocuments: RateRevisionOverridesTablePayload['supportingDocuments']
}

// Merges all RateRevisionOverrides rows for a single revision into one
// effective result. Callers must pre-filter rows to the relevant revisionID.
// Doc arrays are flat-mapped raw rows; downstream helpers handle per-
// documentID sparse-merging.
const mergeRateRevisionOverrides = (
    revisionOverrideRows: RateRevisionOverridesTablePayload[]
): MergedRateRevisionOverride => {
    const rateDocuments: MergedRateRevisionOverride['rateDocuments'] = []
    const supportingDocuments: MergedRateRevisionOverride['supportingDocuments'] =
        []

    for (const row of revisionOverrideRows) {
        rateDocuments.push(...row.rateDocuments)
        supportingDocuments.push(...row.supportingDocuments)
    }

    return { rateDocuments, supportingDocuments }
}

// Builds an effective per-document override patch map by sparse-merging
// rate document override rows in createdAt-asc order (newer wins per field).
// Keyed by documentID. Rate overrides are update-only (documentID is
// required on RateDocumentOverride), so no add-synthesis is needed.
//
// Takes already-flat-mapped doc rows; ordering uses each row's own
// createdAt.
const mergeRateDocumentOverridePatches = (
    docOverrideRows: Array<
        | RateRevisionOverridesTablePayload['rateDocuments'][number]
        | RateRevisionOverridesTablePayload['supportingDocuments'][number]
    >
): Map<string, { dateAdded?: Date | null }> => {
    const ordered = [...docOverrideRows].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )
    const patches = new Map<string, { dateAdded?: Date | null }>()
    for (const docOverride of ordered) {
        const patch = patches.get(docOverride.documentID) ?? {}
        if (docOverride.dateAdded != null) {
            patch.dateAdded = docOverride.dateAdded
        }
        patches.set(docOverride.documentID, patch)
    }
    return patches
}

// Function to take in original document and look for override dateAdded
// returns original doc data and applies override to dateAdded.
const documentDataToDomainModel = (
    originalDoc: RateDocument | RateSupportingDocument,
    overridePatches?: Map<string, { dateAdded?: Date | null }>
): DocumentType => {
    let dateAdded = originalDoc.dateAdded

    const patch = overridePatches?.get(originalDoc.id)
    if (patch?.dateAdded) {
        dateAdded = patch.dateAdded
    }

    return {
        ...originalDoc,
        dateAdded: dateAdded ?? undefined,
        s3BucketName: originalDoc.s3BucketName ?? undefined,
        s3Key: originalDoc.s3Key ?? undefined,
    }
}

function rateFormDataToDomainModel(
    rateRevision: RateRevisionTableWithFormData
): RateFormDataType {
    const packagesWithSharedRateCerts = []
    let statePrograms: ProgramType[] | Error | undefined = undefined

    for (const contract of rateRevision.contractsWithSharedRateRevision) {
        const latestContractRevision = getLatestActiveRevision(
            contract.revisions
        )
        const contractPrograms = latestContractRevision?.programIDs ?? []

        if (!statePrograms) {
            statePrograms = findStatePrograms(contract.stateCode)
        }

        if (statePrograms instanceof Error) {
            logError(
                'prismaSharedContractRateHelpers',
                `Cannot find ${contract.stateCode} programs for packagesWithSharedRateCerts with rate revision ${rateRevision.rateID} and contract ${contract.id}`
            )
            statePrograms = []
        }

        packagesWithSharedRateCerts.push({
            packageId: contract.id,
            packageName: packageName(
                contract.stateCode,
                contract.stateNumber,
                contractPrograms,
                statePrograms
            ),
            packageStatus: getContractRateStatus(contract.revisions),
        })
    }

    // Single entry point for revision-level override application: filter
    // first, merge once, then derive doc patches from the flat-mapped rows.
    const relevantOverrides = (rateRevision.revisionOverrides ?? []).filter(
        (o) => o.rateRevisionID === rateRevision.id
    )
    const mergedOverride = mergeRateRevisionOverrides(relevantOverrides)
    const overridePatches = mergeRateDocumentOverridePatches([
        ...mergedOverride.rateDocuments,
        ...mergedOverride.supportingDocuments,
    ])

    return {
        id: rateRevision.rateID,
        rateID: rateRevision.rateID,
        rateType: rateRevision.rateType ?? undefined,
        rateCapitationType: rateRevision.rateCapitationType ?? undefined,
        rateDocuments: rateRevision.rateDocuments
            ? rateRevision.rateDocuments.map((doc) =>
                  documentDataToDomainModel(doc, overridePatches)
              )
            : [],
        supportingDocuments: rateRevision.supportingDocuments
            ? rateRevision.supportingDocuments.map((doc) =>
                  documentDataToDomainModel(doc, overridePatches)
              )
            : [],
        rateDateStart: rateRevision.rateDateStart ?? undefined,
        rateDateEnd: rateRevision.rateDateEnd ?? undefined,
        rateDateCertified: rateRevision.rateDateCertified ?? undefined,
        amendmentEffectiveDateStart:
            rateRevision.amendmentEffectiveDateStart ?? undefined,
        amendmentEffectiveDateEnd:
            rateRevision.amendmentEffectiveDateEnd ?? undefined,
        rateProgramIDs: rateRevision.rateProgramIDs,
        deprecatedRateProgramIDs: rateRevision.deprecatedRateProgramIDs,
        rateCertificationName: rateRevision.rateCertificationName ?? undefined,
        rateMedicaidPopulations: rateRevision.rateMedicaidPopulations ?? [],
        certifyingActuaryContacts: rateRevision.certifyingActuaryContacts
            ? rateRevision.certifyingActuaryContacts.map((actuary) => ({
                  name: actuary.name ?? undefined,
                  titleRole: actuary.titleRole ?? undefined,
                  email: actuary.email ?? undefined,
                  actuarialFirm: actuary.actuarialFirm ?? undefined,
                  actuarialFirmOther: actuary.actuarialFirmOther ?? undefined,
              }))
            : [],
        addtlActuaryContacts: rateRevision.addtlActuaryContacts
            ? rateRevision.addtlActuaryContacts.map((actuary) => ({
                  name: actuary.name ?? undefined,
                  titleRole: actuary.titleRole ?? undefined,
                  email: actuary.email ?? undefined,
                  actuarialFirm: actuary.actuarialFirm ?? undefined,
                  actuarialFirmOther: actuary.actuarialFirmOther ?? undefined,
              }))
            : [],
        actuaryCommunicationPreference:
            rateRevision.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts,
    }
}

function rateRevisionToDomainModel(
    revision: RateRevisionTableWithFormData
): RateRevisionType {
    const formData = rateFormDataToDomainModel(revision)

    return {
        id: revision.id,
        rateID: revision.rateID,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        formData,
    }
}

function ratesRevisionsToDomainModel(
    rateRevisions: RateRevisionTableWithFormData[]
): RateRevisionType[] | Error {
    const domainRevisions: RateRevisionType[] = []

    rateRevisions.sort(
        (a, b) => a.rate.createdAt.getTime() - b.rate.createdAt.getTime()
    )

    for (const revision of rateRevisions) {
        const domainRevision = rateRevisionToDomainModel(revision)

        domainRevisions.push(domainRevision)
    }

    return domainRevisions
}

function unsortedRatesRevisionsToDomainModel(
    rateRevisions: RateRevisionTableWithFormData[]
): RateRevisionType[] {
    const domainRevisions: RateRevisionType[] = []

    for (const revision of rateRevisions) {
        const domainRevision = rateRevisionToDomainModel(revision)

        domainRevisions.push(domainRevision)
    }

    return domainRevisions
}

// ------

type ContractRevisionTableWithFormData =
    Prisma.ContractRevisionTableGetPayload<{
        include: typeof includeContractFormData
    }>

function contractFormDataToDomainModel(
    contractRevision: ContractRevisionTableWithFormData
): ContractFormDataType {
    // Single entry point for revision-level override application: filter
    // first, merge once, then read effective values per field below.
    const relevantOverrides = (contractRevision.revisionOverrides ?? []).filter(
        (o) => o.contractRevisionID === contractRevision.id
    )
    const mergedOverride = mergeContractRevisionOverrides(relevantOverrides)

    const mergedContractDocuments = mergeContractDocumentOverrides(
        contractRevision.contractDocuments ?? [],
        mergedOverride.contractDocuments,
        contractRevision.id
    )
    const mergedSupportingDocuments = mergeContractDocumentOverrides(
        contractRevision.supportingDocuments ?? [],
        mergedOverride.supportingDocuments,
        contractRevision.id
    )

    return {
        submissionType: contractRevision.submissionType,
        submissionDescription: contractRevision.submissionDescription,
        contractType:
            mergedOverride.contractType ?? contractRevision.contractType,
        programIDs: contractRevision.programIDs ?? [],
        populationCovered: contractRevision.populationCovered ?? undefined,
        riskBasedContract:
            contractRevision.riskBasedContract !== null
                ? contractRevision.riskBasedContract
                : undefined,
        dsnpContract:
            contractRevision.dsnpContract !== null
                ? contractRevision.dsnpContract
                : undefined,
        stateContacts: contractRevision.stateContacts
            ? contractRevision.stateContacts.map((contact) => ({
                  name: contact.name ?? undefined,
                  titleRole: contact.titleRole ?? undefined,
                  email: contact.email ?? undefined,
              }))
            : [],
        supportingDocuments: mergedSupportingDocuments.map((doc) => ({
            ...doc,
            dateAdded: doc.dateAdded ?? undefined,
            s3BucketName: doc.s3BucketName ?? undefined,
            s3Key: doc.s3Key ?? undefined,
        })),
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: mergedContractDocuments.map((doc) => ({
            ...doc,
            dateAdded: doc.dateAdded ?? undefined,
            s3BucketName: doc.s3BucketName ?? undefined,
            s3Key: doc.s3Key ?? undefined,
        })),
        contractDateStart: contractRevision.contractDateStart ?? undefined,
        contractDateEnd: contractRevision.contractDateEnd ?? undefined,
        managedCareEntities: contractRevision.managedCareEntities ?? undefined,
        federalAuthorities: contractRevision.federalAuthorities ?? undefined,
        modifiedBenefitsProvided:
            contractRevision.modifiedBenefitsProvided ?? undefined,
        modifiedGeoAreaServed:
            contractRevision.modifiedGeoAreaServed ?? undefined,
        modifiedMedicaidBeneficiaries:
            contractRevision.modifiedMedicaidBeneficiaries ?? undefined,
        modifiedRiskSharingStrategy:
            contractRevision.modifiedRiskSharingStrategy ?? undefined,
        modifiedIncentiveArrangements:
            contractRevision.modifiedIncentiveArrangements ?? undefined,
        modifiedWitholdAgreements:
            contractRevision.modifiedWitholdAgreements ?? undefined,
        modifiedStateDirectedPayments:
            contractRevision.modifiedStateDirectedPayments ?? undefined,
        modifiedPassThroughPayments:
            contractRevision.modifiedPassThroughPayments ?? undefined,
        modifiedPaymentsForMentalDiseaseInstitutions:
            contractRevision.modifiedPaymentsForMentalDiseaseInstitutions ??
            undefined,
        modifiedMedicalLossRatioStandards:
            contractRevision.modifiedMedicalLossRatioStandards ?? undefined,
        modifiedOtherFinancialPaymentIncentive:
            contractRevision.modifiedOtherFinancialPaymentIncentive ??
            undefined,
        modifiedEnrollmentProcess:
            contractRevision.modifiedEnrollmentProcess ?? undefined,
        modifiedGrevienceAndAppeal:
            contractRevision.modifiedGrevienceAndAppeal ?? undefined,
        modifiedNetworkAdequacyStandards:
            contractRevision.modifiedNetworkAdequacyStandards ?? undefined,
        modifiedLengthOfContract:
            contractRevision.modifiedLengthOfContract ?? undefined,
        modifiedNonRiskPaymentArrangements:
            contractRevision.modifiedNonRiskPaymentArrangements ?? undefined,
        inLieuServicesAndSettings:
            contractRevision.inLieuServicesAndSettings ?? undefined,
        statutoryRegulatoryAttestation:
            contractRevision.statutoryRegulatoryAttestation ?? undefined,
        statutoryRegulatoryAttestationDescription:
            contractRevision.statutoryRegulatoryAttestationDescription ??
            undefined,
        eqroNewContractor: contractRevision.eqroNewContractor ?? undefined,
        eqroProvisionMcoNewOptionalActivity:
            contractRevision.eqroProvisionMcoNewOptionalActivity ?? undefined,
        eqroProvisionNewMcoEqrRelatedActivities:
            contractRevision.eqroProvisionNewMcoEqrRelatedActivities ??
            undefined,
        eqroProvisionChipEqrRelatedActivities:
            contractRevision.eqroProvisionChipEqrRelatedActivities ?? undefined,
        eqroProvisionMcoEqrOrRelatedActivities:
            contractRevision.eqroProvisionMcoEqrOrRelatedActivities ??
            undefined,
    }
}

// -------

export type {
    UpdateInfoTableWithUpdater,
    RateRevisionTableWithFormData,
    ContractRevisionTableWithFormData,
    StrippedRateRevisionTableWithFormData,
    StrippedContractRevisionTableWithFormData,
}

export {
    getConsolidatedContractStatus,
    getConsolidatedRateStatus,
    includeUpdateInfo,
    includeContractFormData,
    includeRateFormData,
    includeStrippedRateFormData,
    includeStrippedContractFormData,
    getContractRateStatus,
    getContractReviewStatus,
    getLatestActiveRevision,
    isDraftRevision,
    isUnlockedRevision,
    isSubmittedRevision,
    isReversedUnlockedRevision,
    convertUpdateInfoToDomainModel,
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
    rateRevisionToDomainModel,
    ratesRevisionsToDomainModel,
    unsortedRatesRevisionsToDomainModel,
    getRateReviewStatus,
    getParentContractID,
    getRelatedContracts,
    DRAFT_PARENT_PLACEHOLDER,
    getNewParentContract,
    mergeContractRevisionOverrides,
    mergeRateRevisionOverrides,
}
