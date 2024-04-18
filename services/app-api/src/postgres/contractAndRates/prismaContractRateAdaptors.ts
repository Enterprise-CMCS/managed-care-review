import type {
    ContractFormEditableType,
    RateFormEditableType,
} from '../../domain-models/contractAndRates'
import type { GenericDocument } from '../../gen/gqlServer'
import { emptify, nullify } from '../prismaDomainAdaptors'

// ADD RETURN TYPES FROM PRISMA SEE "includes" "satifies"
// contractTableFullPayload - contractTableCreateArgs / contract

// Generic helpers
const formatDocsForPrisma = (docs: GenericDocument[]) => {
    return docs.map((d, idx) => {
        delete d['dateAdded']
        return {
            position: idx,
            ...d,
        }
    })
}

function formatOrderedListForPrisma<T>(list: T[]): T[] {
    return list.map((item, idx) => ({
        position: idx,
        ...item,
    }))
}

// Rate helpers
function prismaRateCreateFormDataFromDomain(
    rateFormData: RateFormEditableType
) {
    return {
        rateType: rateFormData.rateType,
        rateCapitationType: rateFormData.rateCapitationType,
        rateDateStart: rateFormData.rateDateStart,
        rateDateEnd: rateFormData.rateDateEnd,
        rateDateCertified: rateFormData.rateDateCertified,
        amendmentEffectiveDateStart: rateFormData.amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd: rateFormData.amendmentEffectiveDateEnd,
        rateProgramIDs: rateFormData.rateProgramIDs,
        rateCertificationName: rateFormData.rateCertificationName,
        rateDocuments: {
            create:
                rateFormData.rateDocuments &&
                formatDocsForPrisma(rateFormData.rateDocuments),
        },
        supportingDocuments: {
            create:
                rateFormData.supportingDocuments &&
                formatDocsForPrisma(rateFormData.supportingDocuments),
        },
        certifyingActuaryContacts: {
            create:
                rateFormData.certifyingActuaryContacts &&
                formatOrderedListForPrisma(
                    rateFormData.certifyingActuaryContacts
                ),
        },
        addtlActuaryContacts: {
            create:
                rateFormData.addtlActuaryContacts &&
                formatOrderedListForPrisma(rateFormData.addtlActuaryContacts),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
        contractsWithSharedRateRevision: {
            connect: rateFormData.packagesWithSharedRateCerts
                ? rateFormData.packagesWithSharedRateCerts.map((p) => ({
                      id: p.packageId,
                  }))
                : [],
        },
    }
}

function prismaUpdateRateFormDataFromDomain(
    rateFormData: RateFormEditableType
) {
    return {
        rateType: nullify(rateFormData.rateType),
        rateCapitationType: nullify(rateFormData.rateCapitationType),
        rateDateStart: nullify(rateFormData.rateDateStart),
        rateDateEnd: nullify(rateFormData.rateDateEnd),
        rateDateCertified: nullify(rateFormData.rateDateCertified),
        amendmentEffectiveDateStart: nullify(
            rateFormData.amendmentEffectiveDateStart
        ),
        amendmentEffectiveDateEnd: nullify(
            rateFormData.amendmentEffectiveDateEnd
        ),
        rateProgramIDs: emptify(rateFormData.rateProgramIDs),
        rateCertificationName: nullify(rateFormData.rateCertificationName),
        rateDocuments: {
            deleteMany: {},
            create:
                rateFormData.rateDocuments &&
                formatDocsForPrisma(rateFormData.rateDocuments),
        },
        supportingDocuments: {
            deleteMany: {},
            create:
                rateFormData.supportingDocuments &&
                formatDocsForPrisma(rateFormData.supportingDocuments),
        },
        certifyingActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.certifyingActuaryContacts &&
                formatOrderedListForPrisma(
                    rateFormData.certifyingActuaryContacts
                ),
        },
        addtlActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.addtlActuaryContacts &&
                formatOrderedListForPrisma(rateFormData.addtlActuaryContacts),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
        contractsWithSharedRateRevision: {
            set: rateFormData.packagesWithSharedRateCerts
                ? rateFormData.packagesWithSharedRateCerts.map((p) => ({
                      id: p.packageId,
                  }))
                : [],
        },
    }
}

// Contract helpers
function prismaCreateContractFormDataFromDomain(
    contractFormData: ContractFormEditableType
) {
    const {
        submissionType,
        submissionDescription,
        programIDs,
        populationCovered,
        riskBasedContract,
        stateContacts,
        supportingDocuments,
        contractType,
        contractExecutionStatus,
        contractDocuments,
        contractDateStart,
        contractDateEnd,
        managedCareEntities,
        federalAuthorities,
        modifiedBenefitsProvided,
        modifiedGeoAreaServed,
        modifiedMedicaidBeneficiaries,
        modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements,
        modifiedWitholdAgreements,
        modifiedStateDirectedPayments,
        modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedMedicalLossRatioStandards,
        modifiedOtherFinancialPaymentIncentive,
        modifiedEnrollmentProcess,
        modifiedGrevienceAndAppeal,
        modifiedNetworkAdequacyStandards,
        modifiedLengthOfContract,
        modifiedNonRiskPaymentArrangements,
        inLieuServicesAndSettings,
    } = contractFormData

    return {
        populationCovered: populationCovered,
        programIDs: programIDs,
        riskBasedContract: riskBasedContract,
        submissionType: submissionType,
        submissionDescription: submissionDescription,
        contractType: contractType,
        contractExecutionStatus,
        contractDocuments: {
            create: contractDocuments && formatDocsForPrisma(contractDocuments),
        },
        supportingDocuments: {
            create:
                supportingDocuments && formatDocsForPrisma(supportingDocuments),
        },
        stateContacts: {
            create: stateContacts && formatOrderedListForPrisma(stateContacts),
        },
        contractDateStart,
        contractDateEnd,
        managedCareEntities,
        federalAuthorities,
        modifiedBenefitsProvided,
        modifiedGeoAreaServed,
        modifiedMedicaidBeneficiaries,
        modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements,
        modifiedWitholdAgreements,
        modifiedStateDirectedPayments,
        modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedMedicalLossRatioStandards,
        modifiedOtherFinancialPaymentIncentive,
        modifiedEnrollmentProcess,
        modifiedGrevienceAndAppeal,
        modifiedNetworkAdequacyStandards,
        modifiedLengthOfContract,
        modifiedNonRiskPaymentArrangements,
        inLieuServicesAndSettings,
    }
}
function prismaUpdateContractFormDataFromDomain(
    contractFormData: ContractFormEditableType
) {
    return {
        populationCovered: nullify(contractFormData.populationCovered),
        programIDs: emptify(contractFormData.programIDs),
        riskBasedContract: nullify(contractFormData.riskBasedContract),
        submissionType: contractFormData.submissionType,
        submissionDescription: contractFormData.submissionDescription,
        contractType: contractFormData.contractType,
        contractExecutionStatus: nullify(
            contractFormData.contractExecutionStatus
        ),
        contractDocuments: {
            deleteMany: {},
            create:
                contractFormData.contractDocuments &&
                formatDocsForPrisma(contractFormData.contractDocuments),
        },
        supportingDocuments: {
            deleteMany: {},
            create:
                contractFormData.supportingDocuments &&
                formatDocsForPrisma(contractFormData.supportingDocuments),
        },
        stateContacts: {
            deleteMany: {},
            create:
                contractFormData.stateContacts &&
                formatOrderedListForPrisma(contractFormData.stateContacts),
        },
        contractDateStart: nullify(contractFormData.contractDateStart),
        contractDateEnd: nullify(contractFormData.contractDateEnd),
        managedCareEntities: emptify(contractFormData.managedCareEntities),
        federalAuthorities: emptify(contractFormData.federalAuthorities),
        inLieuServicesAndSettings: nullify(
            contractFormData.inLieuServicesAndSettings
        ),
        modifiedBenefitsProvided: nullify(
            contractFormData.modifiedBenefitsProvided
        ),
        modifiedGeoAreaServed: nullify(contractFormData.modifiedGeoAreaServed),
        modifiedMedicaidBeneficiaries: nullify(
            contractFormData.modifiedMedicaidBeneficiaries
        ),
        modifiedRiskSharingStrategy: nullify(
            contractFormData.modifiedRiskSharingStrategy
        ),
        modifiedIncentiveArrangements: nullify(
            contractFormData.modifiedIncentiveArrangements
        ),
        modifiedWitholdAgreements: nullify(
            contractFormData.modifiedWitholdAgreements
        ),
        modifiedStateDirectedPayments: nullify(
            contractFormData.modifiedStateDirectedPayments
        ),
        modifiedPassThroughPayments: nullify(
            contractFormData.modifiedPassThroughPayments
        ),
        modifiedPaymentsForMentalDiseaseInstitutions: nullify(
            contractFormData.modifiedPaymentsForMentalDiseaseInstitutions
        ),
        modifiedMedicalLossRatioStandards: nullify(
            contractFormData.modifiedMedicalLossRatioStandards
        ),
        modifiedOtherFinancialPaymentIncentive: nullify(
            contractFormData.modifiedOtherFinancialPaymentIncentive
        ),
        modifiedEnrollmentProcess: nullify(
            contractFormData.modifiedEnrollmentProcess
        ),
        modifiedGrevienceAndAppeal: nullify(
            contractFormData.modifiedGrevienceAndAppeal
        ),
        modifiedNetworkAdequacyStandards: nullify(
            contractFormData.modifiedNetworkAdequacyStandards
        ),
        modifiedLengthOfContract: nullify(
            contractFormData.modifiedLengthOfContract
        ),
        modifiedNonRiskPaymentArrangements: nullify(
            contractFormData.modifiedNonRiskPaymentArrangements
        ),
        statutoryRegulatoryAttestation: nullify(
            contractFormData.statutoryRegulatoryAttestation
        ),
        statutoryRegulatoryAttestationDescription: nullify(
            contractFormData.statutoryRegulatoryAttestationDescription
        ),
    }
}
export {
    prismaRateCreateFormDataFromDomain,
    prismaUpdateRateFormDataFromDomain,
    prismaUpdateContractFormDataFromDomain,
    prismaCreateContractFormDataFromDomain,
}
