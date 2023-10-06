import type {
    PrismaClient,
    ContractRevisionTable,
    ManagedCareEntity,
    ContractTable,
    Prisma,
    HealthPlanRevisionTable,
} from '@prisma/client'

import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

async function migrateContractRevision(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
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
        if (formData.status === 'SUBMITTED' && revision.unlockedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockedBy },
            })

            if (user) {
                createDataObject.unlockInfo = {
                    create: {
                        updatedAt: revision.unlockedAt ?? new Date(),
                        updatedByID: user.id,
                        updatedReason:
                            revision.unlockedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        // add the submit info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.submittedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.submittedBy },
            })
            if (user) {
                createDataObject.submitInfo = {
                    create: {
                        updatedAt: formData.updatedAt,
                        updatedByID: user.id,
                        updatedReason:
                            revision.submittedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.submittedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        // add the contract documents
        let contractDocPos = 0
        const contractDocumentsArray = []
        for (const doc of formData.contractDocuments) {
            const contractDoc: Prisma.ContractDocumentCreateWithoutContractRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: doc.name,
                    s3URL: doc.s3URL,
                    sha256: doc.sha256,
                    position: contractDocPos,
                }
            contractDocumentsArray.push(contractDoc)
            contractDocPos = contractDocPos + 1
        }

        createDataObject.contractDocuments = {
            create: contractDocumentsArray,
        }

        // add the contract supporting documents
        let supportingDocPos = 0
        const supportingDocumentsArray = []
        for (const supportDoc of formData.documents) {
            const contractSupportDoc: Prisma.ContractSupportingDocumentCreateWithoutContractRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: supportDoc.name,
                    s3URL: supportDoc.s3URL,
                    sha256: supportDoc.sha256,
                    position: supportingDocPos,
                }
            supportingDocumentsArray.push(contractSupportDoc)
            supportingDocPos++
        }
        createDataObject.supportingDocuments = {
            create: supportingDocumentsArray,
        }

        // add the state contacts
        let stateContactsPos = 0
        const stateContactsArray = []
        for (const stateContact of formData.stateContacts) {
            const newStateContact: Prisma.StateContactCreateWithoutContractRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: stateContact.name,
                    email: stateContact.email,
                    titleRole: stateContact.titleRole,
                    position: stateContactsPos,
                }
            stateContactsArray.push(newStateContact)
            stateContactsPos++
        }
        createDataObject.stateContacts = {
            create: stateContactsArray,
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
