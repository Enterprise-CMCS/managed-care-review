import {
    ContractType,
    ContractRevisionType,
    ContractFormDataType,
    ContractStatusType,
} from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { RateRevision } from '../../domain-models/contractAndRates/rateType'
import {
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
    UpdateInfoTableWithUpdater,
    DraftRateWithRelations,
    ContractRevisionTableWithRelations,
    ContractRevisionFormDataType,
} from '../prismaTypes'
import { UpdateInfoType } from '../../domain-models'
import { DocumentCategoryType } from 'app-web/src/common-code/healthPlanFormDataType'
import { RateRevisionTable } from '@prisma/client'

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

function getContractStatus(
    revision: Pick<
        ContractRevisionTableWithRelations,
        'createdAt' | 'submitInfo'
    >[]
): ContractStatusType {
    // need to order revisions from latest to earlies
    const latestToEarliestRev = revision.sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const latestRevision = latestToEarliestRev[0]
    return latestRevision?.submitInfo ? 'SUBMITTED' : 'DRAFT'
}

function contractFormDataToDomainModel(
    contractRevision: ContractRevisionFormDataType
): ContractFormDataType {
    return {
        submissionType: contractRevision.submissionType,
        submissionDescription: contractRevision.submissionDescription,
        contractType: contractRevision.contractType,
        programIDs: contractRevision.programIDs ?? [],
        populationCovered: contractRevision.populationCovered ?? undefined,
        riskBasedContract: contractRevision.riskBasedContract ?? undefined,
        stateContacts: contractRevision.stateContacts
            ? contractRevision.stateContacts.map((contact) => ({
                  name: contact.name,
                  titleRole: contact.titleRole,
                  email: contact.email,
              }))
            : [],
        supportingDocuments: contractRevision.supportingDocuments
            ? contractRevision.supportingDocuments.map((doc) => ({
                  name: doc.name,
                  s3URL: doc.s3URL,
                  sha256: doc.sha256 ?? undefined,
                  documentCategories: [
                      'CONTRACT_RELATED',
                  ] as DocumentCategoryType[],
              }))
            : [],
        contractExecutionStatus:
            contractRevision.contractExecutionStatus ?? undefined,
        contractDocuments: contractRevision.contractDocuments
            ? contractRevision.contractDocuments.map((doc) => ({
                  name: doc.name,
                  s3URL: doc.s3URL,
                  sha256: doc.sha256 ?? undefined,
                  documentCategories: ['CONTRACT'] as DocumentCategoryType[],
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
    }
}

function draftRatesToDomainModel(
    draftRates: DraftRateWithRelations[]
): RateRevision[] {
    return draftRates.map((dr) => ({
        id: dr.revisions[0].id,
        revisionFormData: dr.revisions[0].name,
    }))
}

function ratesRevisionsToDomainModel(
    rateRevisions: RateRevisionTable[]
): RateRevision[] {
    return rateRevisions.map((rrev) => ({
        id: rrev.id,
        revisionFormData: rrev.name,
    }))
}

function draftContractRevToDomainModel(
    revision: DraftContractRevisionTableWithRelations
): ContractRevisionType {
    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(revision.draftRates),
    }
}

function draftContractToDomainModel(
    contract: DraftContractTableWithRelations
): ContractType {
    const revisions = contract.revisions.map((cr) =>
        draftContractRevToDomainModel(cr)
    )

    return {
        id: contract.id,
        status: getContractStatus(contract.revisions),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        revisions,
    }
}

export {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    draftContractRevToDomainModel,
    draftContractToDomainModel,
    draftRatesToDomainModel,
    ratesRevisionsToDomainModel,
    getContractStatus,
}
