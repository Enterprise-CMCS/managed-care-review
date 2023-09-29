import type {
    PrismaClient,
    ContractRevisionTable,
    ManagedCareEntity,
    ContractTable,
    Prisma,
} from '@prisma/client'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import type { HealthPlanRevisionType } from '../../domain-models'

async function migrateContractRevision(
    client: PrismaClient,
    revision: HealthPlanRevisionType,
    formData: HealthPlanFormDataType,
    contract: ContractTable
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

        // begin constructing the contract revision
        const createDataObject: Prisma.ContractRevisionTableCreateInput = {
            contract: {
                connect: {
                    id: contract.id,
                },
            },
            id: revision.id,
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
            modifiedBenefitsProvided:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedBenefitsProvided ?? null,
            modifiedGeoAreaServed:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedGeoAreaServed ?? null,
            modifiedMedicaidBeneficiaries:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedMedicaidBeneficiaries ?? null,
            modifiedRiskSharingStrategy:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedRiskSharingStrategy ?? null,
            modifiedIncentiveArrangements:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedIncentiveArrangements ?? null,
            modifiedWitholdAgreements:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedWitholdAgreements ?? null,
            modifiedStateDirectedPayments:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedStateDirectedPayments ?? null,
            modifiedPassThroughPayments:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedPassThroughPayments ?? null,
            modifiedPaymentsForMentalDiseaseInstitutions:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedPaymentsForMentalDiseaseInstitutions ?? null,
            modifiedMedicalLossRatioStandards:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedMedicalLossRatioStandards ?? null,
            modifiedOtherFinancialPaymentIncentive:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedOtherFinancialPaymentIncentive ?? null,
            modifiedEnrollmentProcess:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedEnrollmentProcess ?? null,
            modifiedGrevienceAndAppeal:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedGrevienceAndAppeal ?? null,
            modifiedNetworkAdequacyStandards:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedNetworkAdequacyStandards ?? null,
            modifiedLengthOfContract:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedLengthOfContract ?? null,
            modifiedNonRiskPaymentArrangements:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.modifiedNonRiskPaymentArrangements ?? null,
            inLieuServicesAndSettings:
                formData.contractAmendmentInfo?.modifiedProvisions
                    ?.inLieuServicesAndSettings ?? null,
        }

        // Add the unlocked info to the table if it exists
        console.info(
            `check the revision info: ${(JSON.stringify(revision), null, '  ')}`
        )
        if (formData.status === 'SUBMITTED' && revision.unlockInfo) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockInfo.updatedBy },
            })
            console.info(JSON.stringify(user))
            if (user) {
                createDataObject.unlockInfo = {
                    create: {
                        updatedAt: revision.unlockInfo.updatedAt,
                        updatedByID: user.id,
                        updatedReason:
                            revision.unlockInfo.updatedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockInfo.updatedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        // add the submit info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.submitInfo) {
            const user = await client.user.findFirst({
                where: { email: revision.submitInfo.updatedBy },
            })
            if (user) {
                createDataObject.submitInfo = {
                    create: {
                        updatedAt: formData.updatedAt,
                        updatedByID: user.id,
                        updatedReason:
                            revision.submitInfo.updatedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.submitInfo.updatedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        return await client.contractRevisionTable.create({
            data: createDataObject,
        })
    } catch (err) {
        return new Error(
            `Error creating contract revision for ID ${revision.id}: ${err.message}`
        )
    }
}

export { migrateContractRevision }
