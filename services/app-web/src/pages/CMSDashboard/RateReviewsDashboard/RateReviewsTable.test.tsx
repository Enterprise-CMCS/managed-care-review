import { renderWithProviders } from '../../../testHelpers'
import { RateInDashboardType } from './RateReviewsTable'
import { mockMNState } from '../../../testHelpers/apolloMocks'
import { RateReviewsTable } from './RateReviewsTable'
import { waitFor, screen, within } from '@testing-library/react'

describe('RateReviewsTable', () => {
    const statePrograms = mockMNState().programs
    const tableData = (): RateInDashboardType[] => [
        {
            id: 'rate-1-id',
            name: 'rate-1-certification-name',
            programs: [statePrograms[0]],
            submittedAt: '2023-10-16',
            rateDateStart: new Date('2023-10-16'),
            rateDateEnd: new Date('2024-10-16'),
            status: 'SUBMITTED',
            updatedAt: new Date('2023-10-16'),
            rateType: 'NEW',
            stateName: 'Minnesota',
            contractRevisions: [],
        },
        {
            id: 'rate-2-id',
            name: 'rate-2-certification-name',
            programs: [statePrograms[0]],
            submittedAt: '2023-11-18',
            rateDateStart: new Date('2023-11-18'),
            rateDateEnd: new Date('2024-11-18'),
            status: 'SUBMITTED',
            updatedAt: new Date('2023-11-18'),
            rateType: 'AMENDMENT',
            stateName: 'Minnesota',
            contractRevisions: [],
        },
        {
            id: 'rate-3-id',
            name: 'rate-3-certification-name',
            programs: [statePrograms[0]],
            submittedAt: '2023-12-01',
            rateDateStart: new Date('2023-12-01'),
            rateDateEnd: new Date('2024-12-01'),
            status: 'UNLOCKED',
            updatedAt: new Date('2023-12-01'),
            rateType: 'NEW',
            stateName: 'Minnesota',
            contractRevisions: [],
        },
    ]
    it('renders rates in table correctly', async () => {
        renderWithProviders(
            <RateReviewsTable tableData={tableData()} showFilters={true} />
        )

        await waitFor(() => {
            expect(
                screen.queryByText('Displaying 3 of 3 rates')
            ).toBeInTheDocument()
        })

        const tableRows = screen.getAllByRole('row')

        // expect there to be 4 rows, one of which is the header row
        expect(tableRows).toHaveLength(4)

        // expect rows to be in order where latest updatedAt is first in the array
        expect(
            within(tableRows[1]).getByText('rate-3-certification-name')
        ).toBeInTheDocument()
        expect(
            within(tableRows[2]).getByText('rate-2-certification-name')
        ).toBeInTheDocument()
        expect(
            within(tableRows[3]).getByText('rate-1-certification-name')
        ).toBeInTheDocument()

        // expect filter accordion to be present
        expect(screen.getByTestId('accordion')).toBeInTheDocument()
        expect(screen.getByText('0 filters applied')).toBeInTheDocument()
    })
})
