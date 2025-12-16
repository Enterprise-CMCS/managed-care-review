import { ContractFormData } from '../gen/gqlClient'
import { eqroValidationAndReviewDetermination } from './eqroFormDataValidations'

describe('eqroValidationAndReviewDetermination', () => {
    const defaultFormData = (
        overrides?: Partial<ContractFormData>
    ): ContractFormData => ({
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'], //MN state program
        populationCovered: 'MEDICAID_AND_CHIP',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'Test',
        stateContacts: [
            {
                name: 'test name',
                email: 'test@example.com',
                titleRole: 'title',
            },
        ],
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/contractsupporting1.pdf',
                sha256: 'fakesha',
                name: 'contractSupporting1.pdf',
            },
        ],
        contractType: 'BASE',
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/contract.pdf',
                sha256: 'fakesha',
                name: 'contract.pdf',
            },
        ],
        contractDateStart: '2024-05-04',
        contractDateEnd: '2025-05-04',
        managedCareEntities: ['MCO'],
        federalAuthorities: [],
        eqroNewContractor: true,
        eqroProvisionMcoNewOptionalActivity: true,
        eqroProvisionNewMcoEqrRelatedActivities: false,
        eqroProvisionChipEqrRelatedActivities: null,
        eqroProvisionMcoEqrOrRelatedActivities: null,
        ...overrides,
    })
    
    const eqroBaseContractTestData: {
        formData: ContractFormData
        testDescription: string
        expectedResult: boolean
    }[] = [
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'MEDICAID_AND_CHIP',
                managedCareEntities: ['MCO'],
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when submission is base contract, includes CHIP population, and includes MCO entity.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'MEDICAID',
                managedCareEntities: ['MCO'],
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: true,
            },
            expectedResult: true,
            testDescription:
                'Subject to review when submission is base contract, Medicaid population, and includes MCO entity.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'CHIP',
                managedCareEntities: ['MCO'],
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: false,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when submission is Base contract, includes chip population, and includes MCO entity.',
        },
        {
            formData: {
                ...defaultFormData(),
                contractType: 'BASE',
                populationCovered: 'CHIP',
                managedCareEntities: ['PAHP'],
                eqroProvisionChipEqrRelatedActivities: true,
            },
            expectedResult: false,
            testDescription:
                'Not subject to review when submission is Base contract and does not include MCO entity.',
        },
    ]

    it.each(eqroBaseContractTestData)(
        'Base contract $testDescription', ({ formData, expectedResult }) => {
            expect(
                eqroValidationAndReviewDetermination('test-id', formData)
            ).toBe(expectedResult)
        }
    )
})
