import { vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import selectEvent from 'react-select-event'
import { renderWithProviders } from '../../../testHelpers'
import { AdminSubmissionsTable } from './AdminSubmissionsTable'
import { FlattenContract, FlattenRate } from '../../../gen/gqlClient'
import { fetchCurrentUserMock, mockValidAdminUser } from '@mc-review/mocks'

const mockRate = (overrides: Partial<FlattenRate> = {}): FlattenRate => ({
    __typename: 'FlattenRate',
    rateId: 'rate-1',
    rateStateCode: 'MN',
    rateStateNumber: 1,
    parentContractID: 'contract-1',
    rateStatus: 'SUBMITTED',
    rateReviewStatus: 'UNDER_REVIEW',
    rateConsolidatedStatus: 'SUBMITTED',
    rateCreatedAt: '2025-01-01',
    rateUpdatedAt: '2025-01-01',
    rateRevisionId: 'rate-rev-1',
    rateRevisionCreatedAt: '2025-01-01',
    rateRevisionUpdatedAt: '2025-01-01',
    rateCertificationName: 'Test Rate Cert',
    rateType: 'NEW',
    rateCapitationType: 'RATE_CELL',
    rateDateStart: '2025-01-01',
    rateDateEnd: '2025-12-31',
    rateDateCertified: '2025-01-01',
    rateProgramIDs: [],
    rateMedicaidPopulations: [],
    rateDocuments: [],
    supportingDocuments: [],
    certifyingActuaryContacts: [],
    addtlActuaryContacts: [],
    ...overrides,
})

const mockContract = (
    overrides: Partial<FlattenContract> = {}
): FlattenContract => ({
    __typename: 'FlattenContract',
    contractId: 'contract-1',
    submissionID: 'MCR-MN-0001-TEST',
    stateCode: 'MN',
    stateNumber: 1,
    contractSubmissionType: 'HEALTH_PLAN',
    status: 'SUBMITTED',
    reviewStatus: 'UNDER_REVIEW',
    consolidatedStatus: 'SUBMITTED',
    contractCreatedAt: '2025-01-01',
    contractUpdatedAt: '2025-01-01',
    initiallySubmittedAt: '2025-01-01',
    lastUpdatedForDisplay: '2025-01-15',
    revisionId: 'rev-1',
    revisionCreatedAt: '2025-01-01',
    revisionUpdatedAt: '2025-01-01',
    programIDs: [],
    submissionType: 'CONTRACT_AND_RATES',
    submissionDescription: 'Test submission',
    contractType: 'BASE',
    contractDocuments: [],
    supportingDocuments: [],
    stateContacts: [],
    rateRevisions: [],
    ...overrides,
})

// Helper: submission IDs are rendered inside NavLinks, so use a flexible matcher
const findSubmissionID = (id: string) => screen.findByRole('link', { name: id })

const querySubmissionID = (id: string) =>
    screen.queryByRole('link', { name: id })

// Helper: both FilterAccordions share the same accordion button testid.
// Contract filters is the first, Rate filters is the second.
const openContractFilters = async () => {
    const buttons = screen.getAllByTestId(
        'accordionButton_filterAccordionItems'
    )
    await userEvent.click(buttons[0])
}

const openRateFilters = async () => {
    const buttons = screen.getAllByTestId(
        'accordionButton_filterAccordionItems'
    )
    await userEvent.click(buttons[1])
}

const renderTable = (data: FlattenContract[]) => {
    return renderWithProviders(<AdminSubmissionsTable data={data} />, {
        apolloProvider: {
            mocks: [
                fetchCurrentUserMock({
                    statusCode: 200,
                    user: mockValidAdminUser(),
                }),
            ],
        },
    })
}

// useVirtualizer needs a scroll container with real dimensions.
// jsdom returns 0 for all measurements. Mock Element.getBoundingClientRect
// and scrollHeight so the virtualizer thinks the container is visible.
beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        value: 1000,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        value: 5000,
    })
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 1200,
        height: 1000,
        top: 0,
        left: 0,
        bottom: 1000,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    }))
})

describe('AdminSubmissionsTable', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('renders empty state when no data', () => {
        renderTable([])
        expect(
            screen.getByText('You have no submissions yet')
        ).toBeInTheDocument()
    })

    it('renders table with data', async () => {
        const data = [
            mockContract({ submissionID: 'MCR-MN-0001-TEST' }),
            mockContract({
                contractId: 'contract-2',
                submissionID: 'MCR-OH-0002-TEST',
                stateCode: 'OH',
                stateNumber: 2,
            }),
        ]

        renderTable(data)

        expect(await findSubmissionID('MCR-MN-0001-TEST')).toBeInTheDocument()
        expect(await findSubmissionID('MCR-OH-0002-TEST')).toBeInTheDocument()
    })

    it('displays correct filter count', async () => {
        renderTable([mockContract()])

        await waitFor(() => {
            expect(screen.getByText(/0 filters applied/)).toBeInTheDocument()
        })
    })

    it('displays hidden columns count', async () => {
        renderTable([mockContract()])

        await waitFor(() => {
            expect(screen.getByText(/0 columns hidden/)).toBeInTheDocument()
        })
    })

    describe('contract-level filters', () => {
        const data = [
            mockContract({
                contractId: 'c-1',
                submissionID: 'MCR-MN-0001',
                stateCode: 'MN',
                status: 'SUBMITTED',
            }),
            mockContract({
                contractId: 'c-2',
                submissionID: 'MCR-OH-0002',
                stateCode: 'OH',
                status: 'RESUBMITTED',
            }),
            mockContract({
                contractId: 'c-3',
                submissionID: 'MCR-MN-0003',
                stateCode: 'MN',
                status: 'UNLOCKED',
                consolidatedStatus: 'UNLOCKED',
            }),
        ]

        it('filters by state', async () => {
            renderTable(data)
            await openContractFilters()

            const stateFilter = screen.getByTestId('stateCode-filter')
            const stateCombobox = within(stateFilter).getByRole('combobox')

            selectEvent.openMenu(stateCombobox)
            const stateOptions = screen.getByTestId('stateCode-filter-options')
            await selectEvent.select(stateOptions, 'OH')

            await waitFor(() => {
                expect(querySubmissionID('MCR-OH-0002')).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0001')).not.toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0003')).not.toBeInTheDocument()
            })
        })

        it('filters by status', async () => {
            renderTable(data)
            await openContractFilters()

            const statusFilter = screen.getByTestId('status-filter')
            const statusCombobox = within(statusFilter).getByRole('combobox')

            selectEvent.openMenu(statusCombobox)
            const statusOptions = screen.getByTestId('status-filter-options')
            await selectEvent.select(statusOptions, 'Unlocked')

            await waitFor(() => {
                expect(querySubmissionID('MCR-MN-0003')).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0001')).not.toBeInTheDocument()
                expect(querySubmissionID('MCR-OH-0002')).not.toBeInTheDocument()
            })
        })

        it('filters by managed care entities', async () => {
            renderTable([
                mockContract({
                    contractId: 'c-1',
                    submissionID: 'MCR-MN-0001',
                    managedCareEntities: ['MCO'],
                }),
                mockContract({
                    contractId: 'c-2',
                    submissionID: 'MCR-OH-0002',
                    stateCode: 'OH',
                    managedCareEntities: ['PIHP'],
                }),
                mockContract({
                    contractId: 'c-3',
                    submissionID: 'MCR-FL-0003',
                    stateCode: 'FL',
                    managedCareEntities: ['PAHP', 'MCO'],
                }),
            ])
            await openContractFilters()

            const managedCareEntitiesFilter = screen.getByTestId(
                'managedCareEntities-filter'
            )
            const managedCareEntitiesCombobox = within(
                managedCareEntitiesFilter
            ).getByRole('combobox')

            selectEvent.openMenu(managedCareEntitiesCombobox)
            const managedCareEntitiesOptions = screen.getByTestId(
                'managedCareEntities-filter-options'
            )
            await selectEvent.select(
                managedCareEntitiesOptions,
                'Prepaid Inpatient Health Plan (PIHP)'
            )

            await waitFor(() => {
                expect(querySubmissionID('MCR-OH-0002')).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0001')).not.toBeInTheDocument()
                expect(querySubmissionID('MCR-FL-0003')).not.toBeInTheDocument()
            })
        })

        it('filters by federal authorities', async () => {
            renderTable([
                mockContract({
                    contractId: 'c-1',
                    submissionID: 'MCR-MN-0001',
                    federalAuthorities: ['STATE_PLAN'],
                }),
                mockContract({
                    contractId: 'c-2',
                    submissionID: 'MCR-OH-0002',
                    stateCode: 'OH',
                    federalAuthorities: ['WAIVER_1115'],
                }),
                mockContract({
                    contractId: 'c-3',
                    submissionID: 'MCR-FL-0003',
                    stateCode: 'FL',
                    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
                }),
            ])
            await openContractFilters()

            const federalAuthoritiesFilter = screen.getByTestId(
                'federalAuthorities-filter'
            )
            const federalAuthoritiesCombobox = within(
                federalAuthoritiesFilter
            ).getByRole('combobox')

            selectEvent.openMenu(federalAuthoritiesCombobox)
            const federalAuthoritiesOptions = screen.getByTestId(
                'federalAuthorities-filter-options'
            )
            await selectEvent.select(
                federalAuthoritiesOptions,
                '1115 Waiver Authority'
            )

            await waitFor(() => {
                expect(querySubmissionID('MCR-OH-0002')).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0001')).not.toBeInTheDocument()
                expect(querySubmissionID('MCR-FL-0003')).not.toBeInTheDocument()
            })
        })

        it('clears all filters', async () => {
            renderTable(data)
            await openContractFilters()

            // Apply a state filter
            const stateFilter = screen.getByTestId('stateCode-filter')
            const stateCombobox = within(stateFilter).getByRole('combobox')
            selectEvent.openMenu(stateCombobox)
            const stateOptions = screen.getByTestId('stateCode-filter-options')
            await selectEvent.select(stateOptions, 'OH')

            await waitFor(() => {
                expect(screen.getByText(/1 filter applied/)).toBeInTheDocument()
            })

            // Clear filters — multiple Clear filters buttons exist, pick the first
            const clearButtons = screen.getAllByRole('button', {
                name: /Clear filters/,
            })
            await userEvent.click(clearButtons[0])

            await waitFor(() => {
                expect(
                    screen.getByText(/0 filters applied/)
                ).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0001')).toBeInTheDocument()
                expect(querySubmissionID('MCR-OH-0002')).toBeInTheDocument()
                expect(querySubmissionID('MCR-MN-0003')).toBeInTheDocument()
            })
        })
    })

    describe('rate-level filters', () => {
        const data = [
            mockContract({
                contractId: 'c-1',
                submissionID: 'MCR-MN-0001-RATES',
                rateRevisions: [
                    mockRate({
                        rateId: 'r-1',
                        rateType: 'NEW',
                        rateMedicaidPopulations: ['MEDICAID_ONLY'],
                    }),
                ],
            }),
            mockContract({
                contractId: 'c-2',
                submissionID: 'MCR-OH-0002-RATES',
                stateCode: 'OH',
                rateRevisions: [
                    mockRate({
                        rateId: 'r-2',
                        rateType: 'AMENDMENT',
                        rateMedicaidPopulations: [
                            'MEDICARE_MEDICAID_WITH_DSNP',
                        ],
                    }),
                ],
            }),
            mockContract({
                contractId: 'c-3',
                submissionID: 'MCR-FL-0003-NORATES',
                stateCode: 'FL',
                rateRevisions: [],
            }),
        ]

        it('filters contracts by rate type', async () => {
            renderTable(data)
            await openRateFilters()

            const rateTypeFilter = screen.getByTestId('rateTypeFilter-filter')
            const rateTypeCombobox =
                within(rateTypeFilter).getByRole('combobox')

            selectEvent.openMenu(rateTypeCombobox)
            const rateTypeOptions = screen.getByTestId(
                'rateTypeFilter-filter-options'
            )
            await selectEvent.select(rateTypeOptions, 'Amendment')

            await waitFor(() => {
                expect(
                    querySubmissionID('MCR-OH-0002-RATES')
                ).toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-MN-0001-RATES')
                ).not.toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-FL-0003-NORATES')
                ).not.toBeInTheDocument()
            })
        })

        it('filters contracts by rate medicaid populations (D-SNP)', async () => {
            renderTable(data)
            await openRateFilters()

            const popFilter = screen.getByTestId(
                'rateMedicaidPopulationsFilter-filter'
            )
            const popCombobox = within(popFilter).getByRole('combobox')

            selectEvent.openMenu(popCombobox)
            const popOptions = screen.getByTestId(
                'rateMedicaidPopulationsFilter-filter-options'
            )
            await selectEvent.select(popOptions, 'Dually eligible with D-SNP')

            await waitFor(() => {
                expect(
                    querySubmissionID('MCR-OH-0002-RATES')
                ).toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-MN-0001-RATES')
                ).not.toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-FL-0003-NORATES')
                ).not.toBeInTheDocument()
            })
        })

        it('filters contracts by rate medicaid populations (Medicaid-only)', async () => {
            renderTable(data)
            await openRateFilters()

            const popFilter = screen.getByTestId(
                'rateMedicaidPopulationsFilter-filter'
            )
            const popCombobox = within(popFilter).getByRole('combobox')

            selectEvent.openMenu(popCombobox)
            const popOptions = screen.getByTestId(
                'rateMedicaidPopulationsFilter-filter-options'
            )
            await selectEvent.select(popOptions, 'Medicaid-only')

            await waitFor(() => {
                expect(
                    querySubmissionID('MCR-MN-0001-RATES')
                ).toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-OH-0002-RATES')
                ).not.toBeInTheDocument()
            })
        })

        it('combines contract and rate filters', async () => {
            const extendedData = [
                ...data,
                mockContract({
                    contractId: 'c-4',
                    submissionID: 'MCR-MN-0004-AMEND',
                    stateCode: 'MN',
                    rateRevisions: [
                        mockRate({
                            rateId: 'r-4',
                            rateType: 'AMENDMENT',
                        }),
                    ],
                }),
            ]

            renderTable(extendedData)

            // Open contract filters and filter by MN
            await openContractFilters()

            const stateFilter = screen.getByTestId('stateCode-filter')
            const stateCombobox = within(stateFilter).getByRole('combobox')
            selectEvent.openMenu(stateCombobox)
            const stateOptions = screen.getByTestId('stateCode-filter-options')
            await selectEvent.select(stateOptions, 'MN')

            // Open rate filters and filter by Amendment
            await openRateFilters()

            const rateTypeFilter = screen.getByTestId('rateTypeFilter-filter')
            const rateTypeCombobox =
                within(rateTypeFilter).getByRole('combobox')
            selectEvent.openMenu(rateTypeCombobox)
            const rateTypeOptions = screen.getByTestId(
                'rateTypeFilter-filter-options'
            )
            await selectEvent.select(rateTypeOptions, 'Amendment')

            await waitFor(() => {
                expect(
                    querySubmissionID('MCR-MN-0004-AMEND')
                ).toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-MN-0001-RATES')
                ).not.toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-OH-0002-RATES')
                ).not.toBeInTheDocument()
                expect(
                    querySubmissionID('MCR-FL-0003-NORATES')
                ).not.toBeInTheDocument()
            })
        })
    })
})
