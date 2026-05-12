import type { ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import { unlockContractInsideTransaction } from './unlockContract'

const { mockFindContractWithHistory, mockUnlockRateInDB } = vi.hoisted(() => ({
    mockFindContractWithHistory: vi.fn(),
    mockUnlockRateInDB: vi.fn(),
}))

vi.mock('./findContractWithHistory', () => ({
    findContractWithHistory: mockFindContractWithHistory,
}))

vi.mock('./unlockRate', () => ({
    unlockRateInDB: mockUnlockRateInDB,
}))

const currentSubmittedRevision = {
    id: 'submitted-contract-revision-id',
    contractID: 'contract-id',
    submitInfoID: 'submit-info-id',
    populationCovered: 'MEDICAID',
    programIDs: ['program-id'],
    riskBasedContract: false,
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'Submitted contract',
    contractType: 'BASE',
    dsnpContract: null,
    contractExecutionStatus: 'EXECUTED',
    contractDateStart: null,
    contractDateEnd: null,
    managedCareEntities: ['MCO'],
    federalAuthorities: ['STATE_PLAN'],
    inLieuServicesAndSettings: null,
    modifiedBenefitsProvided: false,
    modifiedGeoAreaServed: false,
    modifiedMedicaidBeneficiaries: false,
    modifiedRiskSharingStrategy: false,
    modifiedIncentiveArrangements: false,
    modifiedWitholdAgreements: false,
    modifiedStateDirectedPayments: false,
    modifiedPassThroughPayments: false,
    modifiedPaymentsForMentalDiseaseInstitutions: false,
    modifiedMedicalLossRatioStandards: false,
    modifiedOtherFinancialPaymentIncentive: false,
    modifiedEnrollmentProcess: false,
    modifiedGrevienceAndAppeal: false,
    modifiedNetworkAdequacyStandards: false,
    modifiedLengthOfContract: false,
    modifiedNonRiskPaymentArrangements: null,
    statutoryRegulatoryAttestation: null,
    statutoryRegulatoryAttestationDescription: null,
    contractDocuments: [],
    supportingDocuments: [],
    stateContacts: [],
    eqroNewContractor: null,
    eqroProvisionMcoNewOptionalActivity: null,
    eqroProvisionNewMcoEqrRelatedActivities: null,
    eqroProvisionChipEqrRelatedActivities: null,
    eqroProvisionMcoEqrOrRelatedActivities: null,
    revisionOverrides: [
        {
            contractRevisionID: 'submitted-contract-revision-id',
            contractType: null,
        },
        {
            contractRevisionID: 'submitted-contract-revision-id',
            contractType: 'AMENDMENT',
        },
    ],
    relatedSubmisions: [
        {
            submissionPackages: [],
        },
    ],
}

describe('unlockContractInsideTransaction contract revision overrides', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('copies the effective overridden contractType into the unlocked draft revision', async () => {
        const createContractRevision = vi.fn()
        const tx = {
            updateInfoTable: {
                create: vi.fn().mockResolvedValue({ id: 'unlock-info-id' }),
            },
            contractRevisionTable: {
                findFirst: vi.fn().mockResolvedValue(currentSubmittedRevision),
                create: createContractRevision,
            },
            rateTable: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            draftRateJoinTable: {
                createMany: vi.fn(),
            },
        } as unknown as PrismaTransactionType

        mockFindContractWithHistory.mockResolvedValue({
            id: 'contract-id',
            draftRevision: {
                id: 'draft-revision-id',
                formData: {
                    contractType: 'AMENDMENT',
                },
            },
            draftRates: [],
        } as unknown as ContractType)

        await unlockContractInsideTransaction(tx, {
            contractID: 'contract-id',
            unlockedByUserID: 'cms-user-id',
            unlockReason: 'unlock to edit',
        })

        expect(createContractRevision).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    contractType: 'AMENDMENT',
                }),
            })
        )
    })
})
