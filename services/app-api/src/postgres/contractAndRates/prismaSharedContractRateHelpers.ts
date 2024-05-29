import type { Prisma } from '@prisma/client'
import type { ProgramType } from '../../domain-models'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    PackageStatusType,
    UpdateInfoType,
    ContractRevisionType,
} from '../../domain-models/contractAndRates'
import { findStatePrograms } from '../state'
import { packageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'

const subincludeUpdateInfo = {
    updatedBy: true,
} satisfies Prisma.UpdateInfoTableInclude

const includeUpdateInfo = {
    include: subincludeUpdateInfo,
}

type UpdateInfoTableWithUpdater = Prisma.UpdateInfoTableGetPayload<{
    include: typeof subincludeUpdateInfo
}>

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
        updatedBy: info.updatedBy.email,
        updatedReason: info.updatedReason,
    }
}

// -----
function getContractRateStatus(
    revisions:
        | ContractRevisionTableWithFormData[]
        | RateRevisionTableWithFormData[]
): PackageStatusType {
    // need to order revisions from latest to earliest
    const revs = revisions.sort(
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

type RateRevisionTableWithFormData = Prisma.RateRevisionTableGetPayload<{
    include: typeof includeRateFormData
}>

function rateFormDataToDomainModel(
    rateRevision: RateRevisionTableWithFormData,
    previousRevision?: RateRevisionTableWithFormData
): RateFormDataType | Error {
    const packagesWithSharedRateCerts = []
    let statePrograms: ProgramType[] | Error | undefined = undefined

    for (const contract of rateRevision.contractsWithSharedRateRevision) {
        const contractPrograms = contract.revisions[0].programIDs

        if (!statePrograms) {
            statePrograms = findStatePrograms(contract.stateCode)
        }

        if (statePrograms instanceof Error) {
            return new Error(
                `Cannot find ${contract.stateCode} programs for packagesWithSharedRateCerts with rate revision ${rateRevision.rateID} and contract ${contract.id}`
            )
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
            ? rateRevision.rateDocuments.map((doc) => {
                  const dateAdded =
                      previousRevision &&
                      previousRevision.rateDocuments.includes(doc)
                          ? previousRevision.submitInfo?.updatedAt
                          : rateRevision.updatedAt

                  return {
                      name: doc.name,
                      s3URL: doc.s3URL,
                      sha256: doc.sha256,
                      dateAdded: dateAdded ?? rateRevision.updatedAt,
                  }
              })
            : [],
        supportingDocuments: rateRevision.supportingDocuments
            ? rateRevision.supportingDocuments.map((doc) => {
                  const dateAdded =
                      previousRevision &&
                      previousRevision.supportingDocuments.includes(doc)
                          ? previousRevision.submitInfo?.updatedAt
                          : rateRevision.updatedAt
                  return {
                      name: doc.name,
                      s3URL: doc.s3URL,
                      sha256: doc.sha256,
                      dateAdded: dateAdded ?? rateRevision.updatedAt,
                  }
              })
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
): RateRevisionType | Error {
    const formData = rateFormDataToDomainModel(revision)

    if (formData instanceof Error) {
        return formData
    }

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
        const sinceDate =
            contractRev.submitInfo?.updatedAt || contractRev.updatedAt
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

// setDateAddedForContractRevisions takes a list of contractRevs and sets dateAdded
// for all documents based on when the doc first appears in the list. The contractRevs
// should be in createdAt order.
function setDateAddedForRateRevisions(rateRevs: RateRevisionType[]) {
    const firstSeenDate: { [sha: string]: Date } = {}

    for (const rateRev of rateRevs) {
        const sinceDate = rateRev.submitInfo?.updatedAt || rateRev.updatedAt
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
): RateRevisionType[] | Error {
    const domainRevisions: RateRevisionType[] = []

    for (const revision of rateRevisions) {
        const domainRevision = rateRevisionToDomainModel(revision)

        if (domainRevision instanceof Error) {
            return domainRevision
        }

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
    contractRevision: ContractRevisionTableWithFormData,
    previousRevision?: ContractRevisionTableWithFormData
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
        supportingDocuments: contractRevision.supportingDocuments
            ? contractRevision.supportingDocuments.map((doc) => {
                  const dateAdded =
                      previousRevision &&
                      previousRevision.supportingDocuments.includes(doc)
                          ? previousRevision.submitInfo?.updatedAt
                          : contractRevision.updatedAt

                  return {
                      name: doc.name,
                      s3URL: doc.s3URL,
                      sha256: doc.sha256 ?? undefined,
                      dateAdded: dateAdded ?? contractRevision.updatedAt,
                  }
              })
            : [],
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: contractRevision.contractDocuments
            ? contractRevision.contractDocuments.map((doc) => {
                  const dateAdded =
                      previousRevision &&
                      previousRevision.contractDocuments.includes(doc)
                          ? previousRevision.submitInfo?.updatedAt
                          : contractRevision.updatedAt
                  return {
                      name: doc.name,
                      s3URL: doc.s3URL,
                      sha256: doc.sha256 ?? undefined,
                      dateAdded: dateAdded ?? contractRevision.updatedAt,
                  }
              })
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
    }
}

// -------

export type {
    UpdateInfoTableWithUpdater,
    RateRevisionTableWithFormData,
    ContractRevisionTableWithFormData,
}

export {
    includeUpdateInfo,
    includeContractFormData,
    includeRateFormData,
    getContractRateStatus,
    convertUpdateInfoToDomainModel,
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
    rateRevisionToDomainModel,
    ratesRevisionsToDomainModel,
    unsortedRatesRevisionsToDomainModel,
    setDateAddedForContractRevisions,
    setDateAddedForRateRevisions,
}
