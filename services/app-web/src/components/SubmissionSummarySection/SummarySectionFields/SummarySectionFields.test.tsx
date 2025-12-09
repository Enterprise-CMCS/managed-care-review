import { renderWithProviders } from '../../../testHelpers'
import {
    EQROModifiedProvisionSummary,
    NewEQROContractorSummary,
} from './SummarySectionFields'
import { ContractFormData } from '../../../gen/gqlClient'
import { screen, waitFor, within } from '@testing-library/react'
import { fetchCurrentUserMock } from '@mc-review/mocks'

const mockFormData = (
    overrides?: Partial<ContractFormData>
): ContractFormData => {
    return {
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
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
    }
}

describe('EQROModifiedProvisionSummary', () => {
    it('renders section correctly', async () => {
        const mockTestData: ContractFormData = mockFormData()
        renderWithProviders(
            <EQROModifiedProvisionSummary contractFormData={mockTestData} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const includeSection = screen.getByLabelText(
            'This contract action includes new or modified provisions related to the following'
        )
        const excludeSection = screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )

        await waitFor(() => {
            expect(includeSection).toBeInTheDocument()
            expect(excludeSection).toBeInTheDocument()
        })

        const withinInclude = within(includeSection)
        const withinExclude = within(excludeSection)

        //expect included provisions
        expect(
            withinInclude.getByText(
                'New optional activities to be performed on MCOs in accordance with 42 CFR § 438.358(c)'
            )
        ).toBeInTheDocument()

        //expect excluded provisions
        expect(
            withinExclude.getByText(
                'EQR-related activities for a new MCO managed care program'
            )
        ).toBeInTheDocument()

        // expect provisions to not be shown
        expect(
            screen.queryByText(
                'EQR-related activities performed on the CHIP population'
            )
        ).toBeNull()

        // expect provisions to not be shown
        expect(
            screen.queryByText(
                'EQR or EQR-related activities performed on MCOs'
            )
        ).toBeNull()
    })
    it('does not render EQRO provisions questions', async () => {
        const mockTestData: ContractFormData = mockFormData({
            populationCovered: 'MEDICAID',
            managedCareEntities: ['PIHP'],
        })
        renderWithProviders(
            <EQROModifiedProvisionSummary contractFormData={mockTestData} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByLabelText(
                    'This contract action includes new or modified provisions related to the following'
                )
            ).toBeNull()
            expect(
                screen.queryByLabelText(
                    'This contract action does NOT include new or modified provisions related to the following'
                )
            ).toBeNull()
        })
    })
})

describe('NewEQROContractorSummary', () => {
    it('renders section correctly', async () => {
        const mockTestData = mockFormData()
        renderWithProviders(
            <NewEQROContractorSummary contractFormData={mockTestData} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const includeSection = screen.getByLabelText(
            'Is this contract with a new EQRO contractor'
        )

        await waitFor(() => {
            expect(includeSection).toBeInTheDocument()
        })

        const withinInclude = within(includeSection)

        //expect included provisions
        expect(withinInclude.getByText('Yes')).toBeInTheDocument()
    })
    it('does not render field correctly', async () => {
        // Ony Base contract action type and MCO managed care entities will show this question.
        const mockTestData = mockFormData({
            contractType: 'AMENDMENT',
        })

        renderWithProviders(
            <NewEQROContractorSummary contractFormData={mockTestData} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByLabelText(
                    'Is this contract with a new EQRO contractor'
                )
            ).toBeNull()
        })
    })
})
