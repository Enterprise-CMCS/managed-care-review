import {
    Contract,
    ContractRevision,
    ContractFormData,
    ContractStatus,
} from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { RateRevision } from '../../domain-models/contractAndRates/rateType'
import {
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
    UpdateInfoTableWithUpdater,
    DraftRateWithRelations,
    ContractRevisionTableWithRelations,
    ContractRevisionFormDataType,
    ContractTableWithRelations,
} from '../prismaTypes'
import { UpdateInfoType } from '../../domain-models'
import { DocumentCategoryType } from 'app-web/src/common-code/healthPlanFormDataType'
import { RateRevisionTable } from '@prisma/client'

// ContractRevisionSet is for the internal building of individual revisions
// we convert them into ContractRevisions to return them
interface ContractRevisionSet {
    contractRev: ContractRevisionTableWithRelations
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    rateRevisions: RateRevisionTable[]
}

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
): ContractStatus {
    // need to order revisions from latest to earlies
    const latestToEarliestRev = revision.sort(
        (revA, revB) => revB.createdAt.getTime() - revA.createdAt.getTime()
    )
    const latestRevision = latestToEarliestRev[0]
    return latestRevision?.submitInfo ? 'SUBMITTED' : 'DRAFT'
}

function contractFormDataToDomainModel(
    contractRevision: ContractRevisionFormDataType
): ContractFormData {
    return {
        programIDs: contractRevision.programIDs ?? undefined,
        populationCovered: contractRevision.populationCovered ?? undefined,
        submissionType: contractRevision.submissionType ?? undefined,
        riskBasedContract: contractRevision.riskBasedContract ?? undefined,
        submissionDescription:
            contractRevision.submissionDescription ?? undefined,
        stateContacts: contractRevision.stateContacts
            ? contractRevision.stateContacts.map((contact) => ({
                  name: contact.name,
                  titleRole: contact.titleRole,
                  email: contact.email,
              }))
            : [],
        addtlActuaryContacts: contractRevision.addtlActuaryContacts
            ? contractRevision.addtlActuaryContacts.map((contact) => ({
                  name: contact.name,
                  titleRole: contact.titleRole,
                  email: contact.email,
                  actuarialFirm: contact.actuarialFirm,
                  actuarialFirmOther: contact.actuarialFirmOther ?? undefined,
              }))
            : [],
        addtlActuaryCommunicationPreference:
            contractRevision.addtlActuaryCommunicationPreference ?? undefined,
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
        contractType: contractRevision.contractType ?? undefined,
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
): ContractRevision {
    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(revision.draftRates),
    }
}

function contractRevToDomainModel(
    revisions: ContractRevisionSet[]
): ContractRevision[] {
    const contractRevisions = revisions.map((entry) => ({
        id: entry.contractRev.id,
        submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
        unlockInfo: entry.unlockInfo
            ? convertUpdateInfoToDomainModel(entry.unlockInfo)
            : undefined,
        createdAt: entry.contractRev.createdAt,
        updatedAt: entry.contractRev.updatedAt,
        formData: contractFormDataToDomainModel(entry.contractRev),
        rateRevisions: ratesRevisionsToDomainModel(entry.rateRevisions),
    }))

    return contractRevisions
}

function draftContractToDomainModel(
    contract: DraftContractTableWithRelations
): Contract {
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

function contractWithHistoryToDomainModel(
    contract: ContractTableWithRelations
): Contract | Error {
    // We iterate through each contract revision in order, adding it as a revision in the history
    // then iterate through each of its rates, constructing a history of any rates that changed
    // between contract revision updates
    const allRevisionSets: ContractRevisionSet[] = []
    const contractRevisions = contract.revisions
    for (const contractRev of contractRevisions) {
        // We exclude the draft from this list, use findDraftContract to get the current draft
        if (!contractRev.submitInfo) {
            continue
        }

        const initialEntry: ContractRevisionSet = {
            contractRev,
            submitInfo: contractRev.submitInfo,
            unlockInfo: contractRev.unlockInfo || undefined,
            rateRevisions: [],
        }

        allRevisionSets.push(initialEntry)

        let lastEntry = initialEntry
        // go through every rate revision in the join table in time order and construct a revisionSet
        // with (or without) the new rate revision in it.
        for (const rateRev of contractRev.rateRevisions) {
            if (!rateRev.rateRevision.submitInfo) {
                return new Error(
                    'Programming Error: a contract is associated with an unsubmitted rate'
                )
            }

            // if it's from before this contract was submitted, it's there at the beginning.
            if (
                rateRev.rateRevision.submitInfo.updatedAt <=
                contractRev.submitInfo.updatedAt
            ) {
                if (!rateRev.isRemoval) {
                    initialEntry.rateRevisions.push(rateRev.rateRevision)
                }
            } else {
                // if after, then it's always a new entry in the list
                let lastRates = [...lastEntry.rateRevisions]

                // take out the previous rate revision this revision supersedes
                lastRates = lastRates.filter(
                    (r) => r.rateID !== rateRev.rateRevision.rateID
                )
                // an isRemoval entry indicates that this rate was removed from this contract.
                if (!rateRev.isRemoval) {
                    lastRates.push(rateRev.rateRevision)
                }

                const newRev: ContractRevisionSet = {
                    contractRev,
                    submitInfo: rateRev.rateRevision.submitInfo,
                    unlockInfo: rateRev.rateRevision.unlockInfo || undefined,
                    rateRevisions: lastRates,
                }

                lastEntry = newRev
                allRevisionSets.push(newRev)
            }
        }
    }

    const revisions = contractRevToDomainModel(allRevisionSets).reverse()

    const contractStatus = getContractStatus(contract.revisions)

    return {
        id: contract.id,
        status: contractStatus,
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        revisions: revisions,
    }
}

export {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    draftContractRevToDomainModel,
    draftContractToDomainModel,
    contractRevToDomainModel,
    draftRatesToDomainModel,
    ratesRevisionsToDomainModel,
    contractWithHistoryToDomainModel,
    getContractStatus,
}
