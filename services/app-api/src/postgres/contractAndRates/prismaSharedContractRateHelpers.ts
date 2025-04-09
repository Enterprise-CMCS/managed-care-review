import type { Prisma } from '@prisma/client'
import type { ProgramType } from '../../domain-models'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    PackageStatusType,
    UpdateInfoType,
    ContractRevisionType,
    ConsolidatedContractStatusType,
} from '../../domain-models/contractAndRates'
import { findStatePrograms } from '../state'
import { packageName } from '@mc-review/hpp'
import { logError } from '../../logger'
import type {
    ContractReviewStatusType,
    RateReviewStatusType,
} from '../../domain-models/contractAndRates/baseContractRateTypes'
import type { ContractTableWithoutDraftRates } from './prismaSubmittedContractHelpers'
import type {
    HealthPlanPackageStatus,
    ContractReviewStatus,
    RateReviewStatus,
} from '../../gen/gqlServer'
import type {
    RateTableWithoutDraftContractsPayload,
    RateRevisionsTableStrippedPayload,
    RateRevisionTablePayload,
    RateTableWithoutDraftContractsStrippedPayload,
} from './prismaSubmittedRateHelpers'
import type { ConsolidatedRateStatusType } from '../../domain-models/contractAndRates/statusType'
import type { RateTableWithRelatedContractsPayload } from './prismaSubmittedRateHelpers'
import type { HealthPlanPackageStatusType } from '../../domain-models'
import type { RelatedContractStripped } from '../../gen/gqlClient'

const subincludeUpdateInfo = {
    updatedBy: true,
} satisfies Prisma.UpdateInfoTableInclude

const includeUpdateInfo = {
    include: subincludeUpdateInfo,
}

type UpdateInfoTableWithUpdater = Prisma.UpdateInfoTableGetPayload<{
    include: typeof subincludeUpdateInfo
}>

const DRAFT_PARENT_PLACEHOLDER = 'DRAFT_PARENT_REPLACE_ME'

const includeContractFormData = {
    unlockInfo: includeUpdateInfo,
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
} satisfies Prisma.ContractRevisionTableInclude

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
function getContractRateStatus(
    revisions:
        | ContractRevisionTableWithFormData[]
        | RateRevisionTableWithFormData[]
        | StrippedRateRevisionTableWithFormData[]
): PackageStatusType {
    // need to order revisions from latest to earliest
    const revs = [...revisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const latestRevision = revs[0]
    // submitted - one revision with submission status
    if (revs.length === 1 && latestRevision.submitInfo) {
        return 'SUBMITTED'
    } else if (revs.length > 1) {
        // unlocked - multiple revs, latest revision has unlocked status and no submitted status
        // resubmitted - multiple revs, latest revision has submitted status
        if (latestRevision.submitInfo) {
            return 'RESUBMITTED'
        }
        return 'UNLOCKED'
    }
    return 'DRAFT'
}

// -----
function getContractReviewStatus(
    contract: ContractTableWithoutDraftRates
): ContractReviewStatusType {
    // need to order actions from latest to earliest
    const actions = [...contract.reviewStatusActions].sort(
        (actionA, actionB) =>
            actionB.updatedAt.getTime() - actionA.updatedAt.getTime()
    )
    const latestAction = actions[0]
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

// Find this rate's parent contract. It'll be the contract it was initially submitted with
// or the contract it is associated with as an initial draft.
const getParentContractID = (
    rateRevisions: RateRevisionsTableStrippedPayload | RateRevisionTablePayload
) => {
    // sort in descending order
    const revisions = [...rateRevisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const firstRevision = revisions[revisions.length - 1]
    const initialSubmission = firstRevision.submitInfo

    let parentContractID = undefined
    if (!initialSubmission) {
        // this is a draft, never submitted, rate
        // this is fragile code
        // because this is a draft, it can only be parented by the single draft contract
        // that created it. But because of the asymmetry required to break the recursive
        // rate-draftContract bit, we don't have access to that here. Put a shibboleth in
        // that can be replaced in higher places.
        parentContractID = 'DRAFT_PARENT_REPLACE_ME'
    } else {
        //find the latest submitted revision with submitted contracts
        const latestSubmittedRevision = revisions.find(
            (revision) => revision.submitInfo?.submittedContracts[0]
        )

        if (latestSubmittedRevision?.submitInfo) {
            if (latestSubmittedRevision.relatedSubmissions.length == 0) {
                console.info('No related submission. Unmigrated rate.')
                parentContractID = '00000000-1111-2222-3333-444444444444'
            } else {
                // there should always only be one submitted contract at the revision level submit info
                const latestParentContract =
                    latestSubmittedRevision.submitInfo.submittedContracts[0]

                if (
                    latestSubmittedRevision.submitInfo?.submittedContracts
                        .length !== 1
                ) {
                    return new Error(
                        'programming error: its a submitted rate that was not submitted with a contract initially'
                    )
                }

                parentContractID = latestParentContract.contractID
            }
        } else {
            return new Error(
                'Could not find a submitted revision to get parent contract id.'
            )
        }
    }

    return parentContractID
}

const getRelatedContracts = (
    rate: RateTableWithRelatedContractsPayload
): RelatedContractStripped[] => {
    const rateRevisions = [...rate.revisions].sort(
        (revA, revB) => revA.createdAt.getTime() - revB.createdAt.getTime()
    )

    let relatedContracts: RelatedContractStripped[] = []
    for (const rateRev of rateRevisions) {
        if (!rateRev.submitInfo) {
            continue
        }

        // get the latest related submissions entry
        const latestRelatedSubmission = rateRev.relatedSubmissions.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        )[0]

        // collect related contracts with latest consolidated statuses
        const contracts: RelatedContractStripped[] = []

        // looping throw all the submission packages of the related submissions to find the contracts for this rate.
        latestRelatedSubmission.submissionPackages.forEach((pkg) => {
            if (pkg.rateRevisionID === rateRev.id) {
                let status: HealthPlanPackageStatusType = 'DRAFT'
                let reviewStatus: ContractReviewStatusType = 'UNDER_REVIEW'

                const submitInfo =
                    pkg.contractRevision.contract.revisions[0].submitInfo
                const unlockInfo =
                    pkg.contractRevision.contract.revisions[0].unlockInfo
                const latestAction =
                    pkg.contractRevision.contract.reviewStatusActions[0]

                // Find the current status of all related contracts as some could be in different status than the rate.
                // If it has both unlock and submit info, then it was resubmitted
                if (submitInfo && unlockInfo) {
                    status = 'RESUBMITTED'
                }
                // if only unlock info, then this unlocked. When unlocking contract, a new revision with unlock info is created.
                if (unlockInfo && !submitInfo) {
                    status = 'UNLOCKED'
                }
                // if there is a submit info, but not unlock info then this is the initial submission.
                if (submitInfo && !unlockInfo) {
                    status = 'SUBMITTED'
                }
                // Contract review statuses
                if (latestAction?.actionType === 'MARK_AS_APPROVED') {
                    reviewStatus = 'APPROVED'
                }
                if (latestAction?.actionType === 'WITHDRAW') {
                    reviewStatus = 'WITHDRAWN'
                }

                // Consolidate the statuses.
                const consolidatedStatus = getConsolidatedContractStatus(
                    status,
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
} satisfies Prisma.RateRevisionTableInclude

const includeStrippedRateFormData = {
    submitInfo: includeUpdateInfo,
    unlockInfo: includeUpdateInfo,
} satisfies Prisma.RateRevisionTableInclude

type RateRevisionTableWithFormData = Prisma.RateRevisionTableGetPayload<{
    include: typeof includeRateFormData
}>

type StrippedRateRevisionTableWithFormData =
    Prisma.RateRevisionTableGetPayload<{
        include: typeof includeStrippedRateFormData
    }>

function rateFormDataToDomainModel(
    rateRevision: RateRevisionTableWithFormData
): RateFormDataType {
    const packagesWithSharedRateCerts = []
    let statePrograms: ProgramType[] | Error | undefined = undefined

    for (const contract of rateRevision.contractsWithSharedRateRevision) {
        const contractPrograms = contract.revisions[0].programIDs

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

    return {
        id: rateRevision.rateID,
        rateID: rateRevision.rateID,
        rateType: rateRevision.rateType ?? undefined,
        rateCapitationType: rateRevision.rateCapitationType ?? undefined,
        rateDocuments: rateRevision.rateDocuments ?? [],
        supportingDocuments: rateRevision.supportingDocuments ?? [],
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

// setDateAddedForContractRevisions takes a list of contractRevs and sets dateAdded
// for all documents based on when the doc first appears in the list. The contractRevs
// should be in createdAt order.
function setDateAddedForContractRevisions(
    contractRevs: ContractRevisionType[]
) {
    const firstSeenDate: { [sha: string]: Date } = {}
    for (const contractRev of contractRevs) {
        const sinceDate = contractRev.submitInfo?.updatedAt
        if (!sinceDate) break
        for (const doc of contractRev.formData.contractDocuments) {
            if (!firstSeenDate[doc.sha256]) {
                firstSeenDate[doc.sha256] = sinceDate
            }
            doc.dateAdded = firstSeenDate[doc.sha256]
        }
        for (const doc of contractRev.formData.supportingDocuments) {
            if (!firstSeenDate[doc.sha256]) {
                firstSeenDate[doc.sha256] = sinceDate
            }

            doc.dateAdded = firstSeenDate[doc.sha256]
        }
    }
}

// setDateAddedForRateRevisions takes a list of rateRevs and sets dateAdded
// for all documents based on when the doc first appears in the list. The contractRevs
// should be in createdAt order.
function setDateAddedForRateRevisions(rateRevs: RateRevisionType[]) {
    const firstSeenDate: { [sha: string]: Date } = {}

    for (const rateRev of rateRevs) {
        const sinceDate = rateRev.submitInfo?.updatedAt
        if (!sinceDate) break
        if (rateRev.formData.rateDocuments) {
            for (const doc of rateRev.formData.rateDocuments) {
                if (!firstSeenDate[doc.sha256]) {
                    firstSeenDate[doc.sha256] = sinceDate
                }
                doc.dateAdded = firstSeenDate[doc.sha256]
            }
        }
        if (rateRev.formData.supportingDocuments) {
            for (const doc of rateRev.formData.supportingDocuments) {
                if (!firstSeenDate[doc.sha256]) {
                    firstSeenDate[doc.sha256] = sinceDate
                }
                doc.dateAdded = firstSeenDate[doc.sha256]
            }
        }
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

        if (domainRevision instanceof Error) {
            return domainRevision
        }

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
    return {
        submissionType: contractRevision.submissionType,
        submissionDescription: contractRevision.submissionDescription,
        contractType: contractRevision.contractType,
        programIDs: contractRevision.programIDs ?? [],
        populationCovered: contractRevision.populationCovered ?? undefined,
        riskBasedContract:
            contractRevision.riskBasedContract !== null
                ? contractRevision.riskBasedContract
                : undefined,
        stateContacts: contractRevision.stateContacts
            ? contractRevision.stateContacts.map((contact) => ({
                  name: contact.name ?? undefined,
                  titleRole: contact.titleRole ?? undefined,
                  email: contact.email ?? undefined,
              }))
            : [],
        supportingDocuments: contractRevision.supportingDocuments ?? [],
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: contractRevision.contractDocuments ?? [],
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
    }
}

// -------

export type {
    UpdateInfoTableWithUpdater,
    RateRevisionTableWithFormData,
    ContractRevisionTableWithFormData,
    StrippedRateRevisionTableWithFormData,
}

export {
    getConsolidatedContractStatus,
    getConsolidatedRateStatus,
    includeUpdateInfo,
    includeContractFormData,
    includeRateFormData,
    includeStrippedRateFormData,
    getContractRateStatus,
    getContractReviewStatus,
    convertUpdateInfoToDomainModel,
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
    rateRevisionToDomainModel,
    ratesRevisionsToDomainModel,
    unsortedRatesRevisionsToDomainModel,
    setDateAddedForContractRevisions,
    setDateAddedForRateRevisions,
    getRateReviewStatus,
    getParentContractID,
    getRelatedContracts,
    DRAFT_PARENT_PLACEHOLDER,
}
