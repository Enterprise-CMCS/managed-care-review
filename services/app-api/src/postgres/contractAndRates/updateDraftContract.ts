import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../storeError'
import type { ContractType } from '../../domain-models/contractAndRates'
import type { PrismaClient } from '@prisma/client'
import type { ContractFormDataType } from '../../domain-models/contractAndRates'

type ContractFormEditable = Partial<ContractFormDataType>

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
        // Given all the Contracts associated with this draft, find the most recent submitted
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

        await client.$transaction([
            //  Clear all related resources on the revision
            client.contractRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    contractDocuments: {
                        deleteMany: {},
                    },
                    supportingDocuments: {
                        deleteMany: {},
                    },
                    stateContacts: {
                        deleteMany: {},
                    },
                },
            }),
            // Then update resource, adjusting all simple fields and creating new linked resources for fields holding relationships to other day,
            client.contractRevisionTable.update({
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
            }),
        ])

        return findContractWithHistory(client, contractID)
    } catch (err) {
        console.error('Prisma error updating contract', err)
        return err
    }
}

export { updateDraftContract }
export type { UpdateContractArgsType, ContractFormEditable }
