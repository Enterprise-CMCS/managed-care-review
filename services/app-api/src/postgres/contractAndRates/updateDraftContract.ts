import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../storeError'
import type { ContractType } from '../../domain-models/contractAndRates'
import type {
    ContractType as DomainContractType,
    PopulationCoveredType,
    SubmissionType,
    ContractExecutionStatus,
    StateContact,
    ManagedCareEntity,
    FederalAuthority,
    SubmissionDocument,
} from 'app-web/src/common-code/healthPlanFormDataType'
import type { PrismaClient } from '@prisma/client'

type ContractFormEditable = {
    submissionType?: SubmissionType
    submissionDescription?: string
    programIDs?: string[]
    populationCovered?: PopulationCoveredType
    riskBasedContract?: boolean
    stateContacts?: StateContact[]
    supportingDocuments?: SubmissionDocument[]
    contractType?: DomainContractType
    contractExecutionStatus?: ContractExecutionStatus
    contractDocuments?: SubmissionDocument[]
    contractDateStart?: Date
    contractDateEnd?: Date
    managedCareEntities?: ManagedCareEntity[]
    federalAuthorities?: FederalAuthority[]
    modifiedBenefitsProvided?: boolean
    modifiedGeoAreaServed?: boolean
    modifiedMedicaidBeneficiaries?: boolean
    modifiedRiskSharingStrategy?: boolean
    modifiedIncentiveArrangements?: boolean
    modifiedWitholdAgreements?: boolean
    modifiedStateDirectedPayments?: boolean
    modifiedPassThroughPayments?: boolean
    modifiedPaymentsForMentalDiseaseInstitutions?: boolean
    modifiedMedicalLossRatioStandards?: boolean
    modifiedOtherFinancialPaymentIncentive?: boolean
    modifiedEnrollmentProcess?: boolean
    modifiedGrevienceAndAppeal?: boolean
    modifiedNetworkAdequacyStandards?: boolean
    modifiedLengthOfContract?: boolean
    modifiedNonRiskPaymentArrangements?: boolean
    inLieuServicesAndSettings?: boolean
}

type UpdateContractArgsType = {
    contractID: string
    formData: ContractFormEditable
    rateIDs: string[]
}
// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContract(
    client: PrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, formData, rateIDs } = args
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
    } = formData

    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to update.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
            console.error(err)
            return new NotFoundError(err)
        }

        await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                populationCovered: populationCovered,
                programIDs: programIDs,
                riskBasedContract: riskBasedContract,
                submissionType: submissionType,
                submissionDescription: submissionDescription,
                contractType: contractType,
                contractExecutionStatus,
                contractDocuments: {
                    create: contractDocuments,
                },
                supportingDocuments: {
                    create: supportingDocuments,
                },
                stateContacts: {
                    create: stateContacts,
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
                draftRates: {
                    set: rateIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
        })

        return findContractWithHistory(client, contractID)
    } catch (err) {
        console.error('UPDATE PRISMA CONTRACT ERR', err)
        return err
    }
}

export { updateDraftContract }
export type { ContractFormEditable, UpdateContractArgsType }
