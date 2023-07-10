import { ContractFormData } from '../postgres/contractAndRates/contractType'
import { UpdateInfoTableWithUpdater } from '../postgres/prismaTypes'
import { UpdateInfoType } from './HealthPlanPackageType'
import {
    ActuaryContact,
    ContractDocument,
    ContractRevisionTable,
    ContractSupportingDocument,
    FederalAuthority,
    ManagedCareEntity,
    StateContact,
} from '@prisma/client'

type ContractFormDataType = ContractRevisionTable & {
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
}
function contractFormDataToDomainModel(
    contractRevision: ContractFormDataType
): ContractFormData {
    return {
        programIDs: contractRevision.programIDs,
        populationCovered: contractRevision.populationCovered ?? undefined,
        submissionType: contractRevision.submissionType,
        riskBasedContract: contractRevision.riskBasedContract ?? undefined,
        submissionDescription:
            contractRevision.submissionDescription ?? undefined,
        stateContacts: contractRevision.stateContacts.map((contact) => ({
            name: contact.name,
            titleRole: contact.titleRole,
            email: contact.email,
        })),
        addtlActuaryContacts: contractRevision.addtlActuaryContacts.map(
            (contact) => ({
                name: contact.name,
                titleRole: contact.titleRole,
                email: contact.email,
                actuarialFirm: contact.actuarialFirm,
                actuarialFirmOther: contact.actuarialFirmOther ?? undefined,
            })
        ),
        addtlActuaryCommunicationPreference:
            contractRevision.addtlActuaryCommunicationPreference ?? undefined,
        supportingDocuments: contractRevision.supportingDocuments.map(
            (doc) => ({
                name: doc.name,
                s3URL: doc.s3URL,
                sha256: doc.sha256 ?? undefined,
                documentCategories: ['CONTRACT_RELATED'],
            })
        ),
        contractType: contractRevision.contractType ?? undefined,
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: contractRevision.contractDocuments.map((doc) => ({
            name: doc.name,
            s3URL: doc.s3URL,
            sha256: doc.sha256 ?? undefined,
            documentCategories: ['CONTRACT'],
        })),
        contractDateStart: contractRevision.contractDateStart ?? undefined,
        contractDateEnd: contractRevision.contractDateEnd ?? undefined,
        managedCareEntities: contractRevision.managedCareEntities,
        federalAuthorities: contractRevision.federalAuthorities,
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
    }
}

function convertUpdateInfo(
    info: UpdateInfoTableWithUpdater | null
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

export { contractFormDataToDomainModel, convertUpdateInfo }
