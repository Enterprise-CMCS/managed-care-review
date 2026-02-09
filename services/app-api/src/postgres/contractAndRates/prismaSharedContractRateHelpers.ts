import type { Prisma } from '@prisma/client'
import type { ProgramType } from '../../domain-models'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    PackageStatusType,
    UpdateInfoType,
    ConsolidatedContractStatusType,
} from '../../domain-models/contractAndRates'
import { findStatePrograms } from '../state'
import { packageName } from '@mc-review/submissions'
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
    RateTableWithoutDraftContractsStrippedPayload,
    RateRevisionTableWithRelatedSubmissionContracts,
    SubmissionPackageContractRevisionData,
    RateTableWithRelatedContractsPayload,
} from './prismaSubmittedRateHelpers'
import type { ConsolidatedRateStatusType } from '../../domain-models/contractAndRates/statusType'
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
        | SubmissionPackageContractRevisionData[]
): PackageStatusType {
    // need to order revisions from latest to earliest
    const revs = [...revisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const latestRevision = revs[0]

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
    const latestRevision = [...rateRevisions].sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )[0]

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
        rateDocuments: rateRevision.rateDocuments
            ? rateRevision.rateDocuments.map((doc) => ({
                  ...doc,
                  dateAdded: doc.dateAdded ?? undefined,
                  s3BucketName: doc.s3BucketName ?? undefined,
                  s3Key: doc.s3Key ?? undefined,
              }))
            : [],
        supportingDocuments: rateRevision.supportingDocuments
            ? rateRevision.supportingDocuments.map((doc) => ({
                  ...doc,
                  dateAdded: doc.dateAdded ?? undefined,
                  s3BucketName: doc.s3BucketName ?? undefined,
                  s3Key: doc.s3Key ?? undefined,
              }))
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
        supportingDocuments: contractRevision.supportingDocuments
            ? contractRevision.supportingDocuments.map((doc) => ({
                  ...doc,
                  dateAdded: doc.dateAdded ?? undefined,
                  s3BucketName: doc.s3BucketName ?? undefined,
                  s3Key: doc.s3Key ?? undefined,
              }))
            : [],
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: contractRevision.contractDocuments
            ? contractRevision.contractDocuments.map((doc) => ({
                  ...doc,
                  dateAdded: doc.dateAdded ?? undefined,
                  s3BucketName: doc.s3BucketName ?? undefined,
                  s3Key: doc.s3Key ?? undefined,
              }))
            : [],
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
    getRateReviewStatus,
    getParentContractID,
    getRelatedContracts,
    DRAFT_PARENT_PLACEHOLDER,
    getNewParentContract,
}
