import { createMockRevision } from '../../testHelpers/protoMigratorHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { migrateContractRevision } from './proto_to_db_ContractRevisions'
import type { ManagedCareEntity } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { decodeFormDataProto } from '../../handlers/proto_to_db'

describe('proto_to_db_ContractRevisions', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('migrates a contract revision', async () => {
        const client = await sharedTestPrismaClient()
        const mockRevision = createMockRevision(uuidv4())

        const formData = decodeFormDataProto(mockRevision)
        if (formData instanceof Error) {
            return formData
        }

        const submitInfoID: string | null = null
        const migratedContract = await migrateContractRevision(
            client,
            mockRevision,
            formData
        )

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
