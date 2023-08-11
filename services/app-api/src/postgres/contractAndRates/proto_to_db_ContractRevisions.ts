import type {
    PrismaClient,
    ContractRevisionTable,
    HealthPlanRevisionTable,
    ManagedCareEntity,
} from '@prisma/client'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

async function migrateContractRevision(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<ContractRevisionTable | Error> {
    try {
        const existingRevision = await client.contractRevisionTable.findUnique({
            where: { id: revision.id },
        })

        if (existingRevision) {
            console.info(
                `Contract revision with ID ${revision.id} already exists. Skipping...`
            )
            return existingRevision
        }

        let submitInfoID: string | null = null
        if (formData.status === 'SUBMITTED' && revision.submittedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.submittedBy },
            })

            if (user) {
                const existingUpdateInfo =
                    await client.updateInfoTable.findFirst({
                        where: { updatedByID: user.id },
                    })

                if (existingUpdateInfo) {
                    submitInfoID = existingUpdateInfo.id
                } else {
                    const newUpdateInfo = await client.updateInfoTable.create({
                        data: {
                            updatedAt: formData.updatedAt,
                            updatedByID: user.id,
                            updatedReason: 'Migrated from previous system',
                        },
                    })
                    submitInfoID = newUpdateInfo.id
                }
            } else {
                console.warn(
                    `User with email ${revision.submittedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        const contractRevision: ContractRevisionTable = {
            id: revision.id,
            contractID: revision.pkgID,
            unlockInfoID: null,
            submitInfoID: submitInfoID,
            createdAt: formData.createdAt,
            updatedAt: formData.updatedAt,
            submissionType: formData.submissionType,
            submissionDescription: formData.submissionDescription,
            programIDs: formData.programIDs,
            populationCovered: formData.populationCovered ?? null,
            riskBasedContract: formData.riskBasedContract ?? null,
            contractType: formData.contractType ?? 'BASE',
            contractExecutionStatus: formData.contractExecutionStatus ?? null,
            contractDateStart: formData.contractDateStart ?? null,
            contractDateEnd: formData.contractDateEnd ?? null,
            managedCareEntities:
                formData.managedCareEntities as ManagedCareEntity[],
            federalAuthorities: formData.federalAuthorities,
            modifiedBenefitsProvided: null,
            modifiedGeoAreaServed: null,
            modifiedMedicaidBeneficiaries: null,
            modifiedRiskSharingStrategy: null,
            modifiedIncentiveArrangements: null,
            modifiedWitholdAgreements: null,
            modifiedStateDirectedPayments: null,
            modifiedPassThroughPayments: null,
            modifiedPaymentsForMentalDiseaseInstitutions: null,
            modifiedMedicalLossRatioStandards: null,
            modifiedOtherFinancialPaymentIncentive: null,
            modifiedEnrollmentProcess: null,
            modifiedGrevienceAndAppeal: null,
            modifiedNetworkAdequacyStandards: null,
            modifiedLengthOfContract: null,
            modifiedNonRiskPaymentArrangements: null,
            inLieuServicesAndSettings: null,
        }

        const createdContractRevision =
            await client.contractRevisionTable.create({
                data: contractRevision,
            })

        return createdContractRevision
    } catch (error) {
        console.error(
            `Error creating contract revision for ID ${revision.id}: ${error.message}`
        )
        return new Error(
            `Error creating contract revision for ID ${revision.id}: ${error.message}`
        )
    }
}

export { migrateContractRevision }
