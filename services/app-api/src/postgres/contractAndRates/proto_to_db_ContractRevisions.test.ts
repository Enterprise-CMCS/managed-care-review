import { toDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import { createMockRevision } from '../../testHelpers/protoMigratorHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import { migrateContractRevision } from './proto_to_db_ContractRevisions'
import type { ManagedCareEntity } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

describe('proto_to_db_ContractRevisions', () => {
    it('migrates a contract revision', async () => {
        const client = await sharedTestPrismaClient()
        const mockRevision = createMockRevision(uuidv4())
        // decode the proto
        const decodedFormDataProto = toDomain(mockRevision.formDataProto)
        if (decodedFormDataProto instanceof Error) {
            const error = new Error(
                `Error in toDomain for ${mockRevision.id}: ${decodedFormDataProto.message}`
            )
            return error
        }
        const formData = decodedFormDataProto as HealthPlanFormDataType

        const submitInfoID: string | null = null
        const migratedContract = await migrateContractRevision(
            client,
            mockRevision,
            formData
        )

        expect(migratedContract).toHaveProperty('id')
        expect(migratedContract).toEqual(
            expect.objectContaining({
                id: mockRevision.id,
                contractID: mockRevision.pkgID,
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
                contractExecutionStatus:
                    formData.contractExecutionStatus ?? null,
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
            })
        )
    })
})
