import type { PrismaClient } from '@prisma/client'
import type {
    ContractType,
    ContractFormDataType,
} from '../../domain-models/contractAndRates'
import { parseContractWithHistory } from './parseContractWithHistory'
import { includeFullContract } from './prismaSubmittedContractHelpers'

type InsertContractArgsType = Partial<ContractFormDataType> & {
    // Certain fields are required on insert contract only
    stateCode: string
    programIDs: ContractFormDataType['programIDs']
    submissionType: ContractFormDataType['submissionType']
    submissionDescription: ContractFormDataType['submissionDescription']
    contractType: ContractFormDataType['contractType']
}

// creates a new contract, with a new revision
async function insertDraftContract(
    client: PrismaClient,
    args: InsertContractArgsType
): Promise<ContractType | Error> {
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
    } = args
    try {
        return await client.$transaction(async (tx) => {
            const { latestStateSubmissionNumber } = await tx.state.update({
                data: {
                    latestStateSubmissionNumber: {
                        increment: 1,
                    },
                },
                where: {
                    stateCode: args.stateCode,
                },
            })

            const contract = await tx.contractTable.create({
                data: {
                    stateCode: args.stateCode,
                    stateNumber: latestStateSubmissionNumber,
                    revisions: {
                        create: {
                            populationCovered: populationCovered,
                            programIDs: programIDs,
                            riskBasedContract: riskBasedContract,
                            submissionType: submissionType,
                            submissionDescription: submissionDescription,
                            contractType: contractType,
                            contractExecutionStatus,
                            contractDocuments: {
                                create:
                                    contractDocuments &&
                                    contractDocuments.map((d, idx) => ({
                                        position: idx,
                                        ...d,
                                    })),
                            },
                            supportingDocuments: {
                                create:
                                    supportingDocuments &&
                                    supportingDocuments.map((d, idx) => ({
                                        position: idx,
                                        ...d,
                                    })),
                            },
                            stateContacts: {
                                create:
                                    stateContacts &&
                                    stateContacts.map((c, idx) => ({
                                        position: idx,
                                        ...c,
                                    })),
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
                        },
                    },
                },
                include: includeFullContract,
            })
            console.info(contract, '============== contract =========')

            return parseContractWithHistory(contract)
        })
    } catch (err) {
        console.error('Prisma error inserting contract', err)
        return err
    }
}

export { insertDraftContract }
export type { InsertContractArgsType }
