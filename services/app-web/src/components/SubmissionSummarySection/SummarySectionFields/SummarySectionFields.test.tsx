import { renderWithProviders } from '../../../testHelpers'
import {
    EQROModifiedProvisionSummary,
    NewEQROContractorSummary,
} from './SummarySectionFields'
import { ContractFormData } from '../../../gen/gqlClient'
import { screen, waitFor, within } from '@testing-library/react'
import { fetchCurrentUserMock, mockContractFormData } from '@mc-review/mocks'

const mockEQROFormData = (
    overrides?: Partial<ContractFormData>
): ContractFormData => {
    return mockContractFormData({
        populationCovered: 'MEDICAID_AND_CHIP',
        contractType: 'BASE',
        submissionType: 'CONTRACT_ONLY',
        managedCareEntities: ['MCO'],
        eqroNewContractor: true,
        eqroProvisionMcoNewOptionalActivity: true,
        eqroProvisionNewMcoEqrRelatedActivities: false,
        eqroProvisionChipEqrRelatedActivities: null,
        eqroProvisionMcoEqrOrRelatedActivities: null,
        ...overrides,
    })
}

describe('EQROModifiedProvisionSummary', () => {
    it('renders section correctly', async () => {
        const mockTestData: ContractFormData = mockEQROFormData()
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
        const mockTestData: ContractFormData = mockEQROFormData({
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
        const mockTestData = mockEQROFormData()
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
                screen.getByLabelText(
                    'Is this contract with a new EQRO contractor'
                )
            ).toBeInTheDocument()
        })

        const includeSection = screen.getByLabelText(
            'Is this contract with a new EQRO contractor'
        )

        const withinInclude = within(includeSection)

        //expect included provisions
        expect(withinInclude.getByText('Yes')).toBeInTheDocument()
    })
    it('does not render field correctly', async () => {
        // Ony Base contract action type and MCO managed care entities will show this question.
        const mockTestData = mockEQROFormData({
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
