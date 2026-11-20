import { screen, within } from '@testing-library/react'
import { mockValidCMSUser, mockValidStateUser } from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { ILOSTable, ILOSSubmissionInDashboardType } from './ILOSTable'

const submittedILOS: ILOSSubmissionInDashboardType = {
    id: 'ilos-submitted-id',
    name: 'MCR-ILOS-MN-0001',
    stateName: 'Minnesota',
    rateDateStart: new Date('2023-07-01'),
    rateDateEnd: new Date('2024-06-30'),
    submittedAt: '2026-10-10T18:00:00.000Z',
    status: 'SUBMITTED',
}

const draftILOS: ILOSSubmissionInDashboardType = {
    id: 'ilos-draft-id',
    name: 'MCR-ILOS-MN-0002',
    stateName: 'Minnesota',
    rateDateStart: undefined,
    rateDateEnd: undefined,
    submittedAt: undefined,
    status: 'DRAFT',
}

const columnHeaderNames = () =>
    screen.getAllByRole('columnheader').map((header) => header.textContent)

describe('ILOSTable', () => {
    it('renders the state user columns without a state column', () => {
        renderWithProviders(
            <ILOSTable
                tableData={[submittedILOS]}
                user={mockValidStateUser()}
            />
        )

        expect(columnHeaderNames()).toEqual([
            'ID',
            'Rating period start date',
            'Rating period end date',
            'Submitted on',
            'Status',
        ])
    })

    it('renders a state column for CMS users', () => {
        renderWithProviders(
            <ILOSTable tableData={[submittedILOS]} user={mockValidCMSUser()} />
        )

        expect(columnHeaderNames()).toEqual([
            'ID',
            'State',
            'Rating period start date',
            'Rating period end date',
            'Submitted on',
            'Status',
        ])
        expect(
            screen.getByTestId('ilos-submission-stateName')
        ).toHaveTextContent('Minnesota')
    })

    it('renders the rating period, submitted on date and status of a submitted ILOS submission', () => {
        renderWithProviders(
            <ILOSTable
                tableData={[submittedILOS]}
                user={mockValidStateUser()}
            />
        )

        const row = within(screen.getByTestId('row-ilos-submitted-id'))
        expect(
            row.getByTestId('ilos-submission-rate-date-start')
        ).toHaveTextContent('07/01/2023')
        expect(
            row.getByTestId('ilos-submission-rate-date-end')
        ).toHaveTextContent('06/30/2024')
        expect(row.getByTestId('ilos-submission-date')).toHaveTextContent(
            '10/10/2026'
        )
        expect(row.getByTestId('ilos-submission-status')).toHaveTextContent(
            'Submitted'
        )
    })

    it('renders empty date cells for a draft that has no dates yet', () => {
        renderWithProviders(
            <ILOSTable tableData={[draftILOS]} user={mockValidStateUser()} />
        )

        const row = within(screen.getByTestId('row-ilos-draft-id'))
        expect(
            row.getByTestId('ilos-submission-rate-date-start')
        ).toBeEmptyDOMElement()
        expect(
            row.getByTestId('ilos-submission-rate-date-end')
        ).toBeEmptyDOMElement()
        expect(row.getByTestId('ilos-submission-date')).toBeEmptyDOMElement()
        expect(row.getByTestId('ilos-submission-status')).toHaveTextContent(
            'Draft'
        )
    })

    it.each([
        {
            status: 'DRAFT' as const,
            expectedPath: '/submissions/ilos/ilos-link-id/edit/type',
        },
        {
            status: 'UNLOCKED' as const,
            expectedPath:
                '/submissions/ilos/ilos-link-id/edit/review-and-submit',
        },
        {
            status: 'SUBMITTED' as const,
            expectedPath: '/submissions/ilos/ilos-link-id',
        },
        {
            status: 'RESUBMITTED' as const,
            expectedPath: '/submissions/ilos/ilos-link-id',
        },
    ])(
        'links a state user to $expectedPath when the status is $status',
        ({ status, expectedPath }) => {
            renderWithProviders(
                <ILOSTable
                    tableData={[
                        {
                            id: 'ilos-link-id',
                            name: 'MCR-ILOS-MN-0003',
                            stateName: 'Minnesota',
                            status,
                        },
                    ]}
                    user={mockValidStateUser()}
                />
            )

            expect(
                screen.getByRole('link', { name: 'MCR-ILOS-MN-0003' })
            ).toHaveAttribute('href', expectedPath)
        }
    )

    it.each([
        { status: 'SUBMITTED' as const },
        { status: 'UNLOCKED' as const },
    ])(
        'links a CMS user to the summary page when the status is $status',
        ({ status }) => {
            renderWithProviders(
                <ILOSTable
                    tableData={[
                        {
                            id: 'ilos-link-id',
                            name: 'MCR-ILOS-MN-0003',
                            stateName: 'Minnesota',
                            status,
                        },
                    ]}
                    user={mockValidCMSUser()}
                />
            )

            expect(
                screen.getByRole('link', { name: 'MCR-ILOS-MN-0003' })
            ).toHaveAttribute('href', '/submissions/ilos/ilos-link-id')
        }
    )

    it('renders the empty message when there are no ILOS submissions', () => {
        renderWithProviders(
            <ILOSTable tableData={[]} user={mockValidStateUser()} />
        )

        expect(screen.getByTestId('ilos-table-empty')).toHaveTextContent(
            'You have no ILOS submissions yet'
        )
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
})
