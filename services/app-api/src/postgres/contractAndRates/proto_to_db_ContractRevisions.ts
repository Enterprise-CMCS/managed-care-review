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

        // find the user if it has been submitted
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
        // find the user if it has been unlocked
        let unlockInfoID: string | null = null
        if (formData.status === 'SUBMITTED' && revision.unlockedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockedBy },
            })

            if (user) {
                const existingUnlockInfo =
                    await client.updateInfoTable.findFirst({
                        where: { updatedByID: user.id },
                    })

                if (existingUnlockInfo) {
                    unlockInfoID = existingUnlockInfo.id
                } else {
                    const newUnlockInfo = await client.updateInfoTable.create({
                        data: {
                            updatedAt:
                                revision.unlockedAt ?? formData.updatedAt, //TODO: not sure what we want to fall back to here
                            updatedByID: user.id,
                            updatedReason:
                                revision.unlockedReason ??
                                'Migrated from previous system',
                        },
                    })
                    unlockInfoID = newUnlockInfo.id
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        const contractRevision: ContractRevisionTable = {
            id: revision.id,
            contractID: revision.pkgID,
            unlockInfoID: unlockInfoID,
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

        const createdContractRevision =
            await client.contractRevisionTable.create({
                data: contractRevision,
            })

        return createdContractRevision
    } catch (err) {
        return new Error(
            `Error creating contract revision for ID ${revision.id}: ${err.message}`
        )
    }
}

export { migrateContractRevision }
