import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraphQLError } from 'graphql'

import { StateDashboard } from './StateDashboard'
import {
    fetchCurrentUserMock,
    indexContractsStrippedMockSuccess,
    indexIlosSubmissionsStrippedMockSuccess,
    mockContractStripped,
    mockILOSContractStripped,
    mockUnlockedContractStripped,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { StateSubmissionsDashboard } from './StateSubmissionsDashboard'
import { ILOSDashboard } from '../ILOSDashboard'
import { IndexContractsStrippedDocument } from '../../gen/gqlClient'
import {
    Navigate,
    type NavigateFunction,
    Route,
    Routes,
} from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

// copy paste from AppRoutes - this is to allow testing of the react router Outlet
const StateDashboardNestedRoutes = () => (
    <Routes>
        <Route
            path={RoutesRecord.ROOT}
            element={<Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />}
        />
        <Route element={<StateDashboard />}>
            <Route
                path={RoutesRecord.DASHBOARD_SUBMISSIONS}
                element={<StateSubmissionsDashboard />}
            />
            <Route
                path={RoutesRecord.DASHBOARD_ILOS}
                element={<ILOSDashboard />}
            />
        </Route>
    </Routes>
)

describe('StateDashboard', () => {
    it('displays dashboard heading', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([]),
                ],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('heading', {
                    level: 1,
                    name: 'Dashboard',
                })
            ).toBeInTheDocument()
        )
    })

    it('displays new submission link', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([]),
                ],
            },
        })

        await waitFor(() => {
            const links = screen.getAllByRole('link', {
                name: 'Start new submission',
            })
            expect(links).toBeDefined()
            expect(links[0]).toHaveAttribute('href', '/submissions/new')
        })
    })

    it('displays texts "sent to CMS", "you can view your review decision", and link "view submission summary" if submission type is EQRO', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([]),
                ],
            },
            routerProvider: {
                route: '/dashboard/submissions?justSubmitted=MCR-MN-0001-SNBC&contractType=EQRO&id=ba46c7ec-7d07-477f-ad24-feef608b08aa',
            },
        })

        await waitFor(() => {
            expect(
                screen.getByText(/MCR-MN-0001-SNBC was sent to CMS/)
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    /You can view your review decision on the submission summary/
                )
            ).toBeInTheDocument()

            const link = screen.getByRole('link', {
                name: /View submission summary/i,
            })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute(
                'href',
                '/submissions/eqro/ba46c7ec-7d07-477f-ad24-feef608b08aa'
            )
        })
    })

    it('displays texts "sent to CMS", "you can view your review decision", and link "view submission summary" if submission type is HEALTH_PLAN', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([]),
                ],
            },
            routerProvider: {
                route: '/dashboard/submissions?justSubmitted=MCR-MN-0001-SNBC&contractType=HEALTH_PLAN&id=ba46c7ec-7d07-477f-ad24-feef608b08aa',
            },
        })

        await waitFor(() => {
            expect(
                screen.getByText(/MCR-MN-0001-SNBC was sent to CMS/)
            ).toBeInTheDocument()

            expect(
                screen.getByText(
                    /To make edits, ask your DMCO lead analyst to unlock your submission/
                )
            ).toBeInTheDocument()

            const link = screen.getByRole('link', {
                name: /View submission summary/i,
            })
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute(
                'href',
                '/submissions/health-plan/ba46c7ec-7d07-477f-ad24-feef608b08aa'
            )
        })
    })

    it('displays submissions table', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        // set draft current revision to a far future updatedAt. Set unlocked to nearer future. This allows us to test sorting.
        const draft = mockContractStripped({
            id: 'test-abc-draft',
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            draftRevision: {
                __typename: 'ContractRevisionStripped',
                id: 'draft-rev-1',
                contractID: 'test-abc-draft',
                createdAt: new Date('2100-01-01'),
                updatedAt: new Date('2100-01-01'),
                contractName: 'MCR-MN-0005-SNBC',
                submitInfo: null,
                unlockInfo: null,
                formData: {
                    __typename: 'ContractFormDataStripped',
                    programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    managedCareEntities: ['MCO'],
                },
            },
            latestSubmittedRevision: null,
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexContractsStrippedMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')

        const link1 = within(rows[1]).getByRole('link')
        expect(link1).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-draft/edit/type'
        )

        const link2 = within(rows[2]).getByRole('link')
        expect(link2).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-unlocked/edit/review-and-submit'
        )

        const link3 = within(rows[3]).getByRole('link')
        expect(link3).toHaveAttribute(
            'href',
            '/submissions/health-plan/test-abc-submitted'
        )
    })

    it('displays the review status tag when it has been set', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: false,
                        isDeprecated: false,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        const approved = mockContractStripped({
            id: 'test-abc-approved',
            consolidatedStatus: 'APPROVED',
            reviewStatus: 'APPROVED',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            reviewStatusActions: [
                {
                    __typename: 'ContractReviewStatusActions',
                    contractID: 'test-abc-approved',
                    updatedAt: new Date('2100-01-01'),
                    actionType: 'MARK_AS_APPROVED',
                },
            ],
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [approved, submitted, unlocked]

        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexContractsStrippedMockSuccess(submissions),
                ],
            },
        })

        // we want to check that there's a table with three submissions, sorted by `updatedAt`.
        const rows = await screen.findAllByRole('row')

        const row1 = within(rows[1]).getByTestId('submission-status')
        expect(row1).toHaveTextContent('Approved')

        const row2 = within(rows[2]).getByTestId('submission-status')
        expect(row2).toHaveTextContent('Unlocked')

        const row3 = within(rows[3]).getByTestId('submission-status')
        expect(row3).toHaveTextContent('Submitted')
    })

    it('displays submissions table without rate programs', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    {
                        id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        fullName: 'Special Needs Basic Care',
                        name: 'SNBC',
                        isRateProgram: true,
                        isDeprecated: false,
                    },
                    {
                        id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        fullName: 'Prepaid Medical Assistance Program',
                        name: 'PMAP',
                        isRateProgram: true,
                        isDeprecated: false,
                    },
                    {
                        id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                        fullName: 'Minnesota Senior Care Plus ',
                        name: 'MSC+',
                        isRateProgram: true,
                        isDeprecated: false,
                    },
                    {
                        id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        fullName: 'Minnesota Senior Health Options',
                        name: 'MSHO',
                        isRateProgram: true,
                        isDeprecated: false,
                    },
                ],
            },
            role: 'State User',
            email: 'bob@dmas.mn.gov',
        }

        // set draft current revision to a far future updatedAt. Set unlocked to nearer future. This allows us to test sorting.
        const draft = mockContractStripped({
            id: 'test-abc-draft',
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            draftRevision: {
                __typename: 'ContractRevisionStripped',
                id: 'draft-rev-1',
                contractID: 'test-abc-draft',
                createdAt: new Date('2100-01-01'),
                updatedAt: new Date('2100-01-01'),
                contractName: 'MCR-MN-0005-SNBC',
                submitInfo: null,
                unlockInfo: null,
                formData: {
                    __typename: 'ContractFormDataStripped',
                    programIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    managedCareEntities: ['MCO'],
                },
            },
            latestSubmittedRevision: null,
        })

        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const submissions = [draft, submitted, unlocked]

        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200, user: mockUser }),
                    indexContractsStrippedMockSuccess(submissions),
                ],
            },
        })

        await waitFor(() => {
            expect(screen.getByText(/No programs exist/)).toBeInTheDocument()
        })
    })

    it('displays state dashboard filters with contract type and status when eqro submissions are enabled', async () => {
        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        const draft = mockContractStripped({
            id: 'test-abc-draft',
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
            contractSubmissionType: 'EQRO',
            lastUpdatedForDisplay: new Date('2100-01-01'),
            draftRevision: {
                __typename: 'ContractRevisionStripped',
                id: 'draft-rev-1',
                contractID: 'test-abc-draft',
                createdAt: new Date('2100-01-01'),
                updatedAt: new Date('2100-01-01'),
                contractName: 'MCR-MN-0005-EQRO',
                submitInfo: null,
                unlockInfo: null,
                formData: {
                    __typename: 'ContractFormDataStripped',
                    programIDs: [],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    managedCareEntities: ['MCO'],
                },
            },
            latestSubmittedRevision: null,
        })

        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([
                        draft,
                        submitted,
                        unlocked,
                    ]),
                ],
            },
            featureFlags: { 'eqro-submissions': true },
        })

        expect(await screen.findByTestId('accordion')).toBeInTheDocument()
        expect(screen.getByTestId('contractType-filter')).toBeInTheDocument()
        expect(screen.getByTestId('programs-filter')).toBeInTheDocument()
        expect(screen.getByTestId('status-filter')).toBeInTheDocument()
        expect(screen.queryByTestId('state-filter')).not.toBeInTheDocument()
        expect(
            screen.queryByTestId('submissionType-filter')
        ).not.toBeInTheDocument()
        expect(screen.getByText('0 filters applied')).toBeInTheDocument()
        expect(
            screen.getByText('Displaying 3 of 3 submissions')
        ).toBeInTheDocument()
    })

    it('displays only status filter on state dashboard when eqro submissions are disabled', async () => {
        const submitted = mockContractStripped({
            id: 'test-abc-submitted',
            lastUpdatedForDisplay: new Date('1991-01-01'),
        })

        const unlocked = mockUnlockedContractStripped({
            id: 'test-abc-unlocked',
            lastUpdatedForDisplay: new Date('2020-01-01'),
        })

        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexContractsStrippedMockSuccess([submitted, unlocked]),
                ],
            },
            featureFlags: { 'eqro-submissions': false },
        })

        expect(await screen.findByTestId('accordion')).toBeInTheDocument()
        expect(screen.getByTestId('programs-filter')).toBeInTheDocument()
        expect(screen.getByTestId('status-filter')).toBeInTheDocument()
        expect(
            screen.queryByTestId('contractType-filter')
        ).not.toBeInTheDocument()
        expect(screen.queryByTestId('state-filter')).not.toBeInTheDocument()
        expect(
            screen.queryByTestId('submissionType-filter')
        ).not.toBeInTheDocument()
    })

    it('displays a loading indicator below the dashboard heading while the submissions load', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    {
                        request: { query: IndexContractsStrippedDocument },
                        result: indexContractsStrippedMockSuccess([]).result,
                        delay: Infinity,
                    },
                ],
            },
        })

        expect(
            await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
        ).toBeInTheDocument()
        // The loading indicator only shows after a short delay.
        expect(
            await screen.findByRole(
                'heading',
                { name: 'Loading' },
                { timeout: 2000 }
            )
        ).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('displays an error banner below the dashboard heading when the submissions query fails', async () => {
        renderWithProviders(<StateDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    {
                        request: { query: IndexContractsStrippedDocument },
                        result: {
                            errors: [
                                new GraphQLError('Submissions index failed'),
                            ],
                        },
                    },
                ],
            },
        })

        expect(
            await screen.findByRole('heading', { name: /System error/ })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', { level: 1, name: 'Dashboard' })
        ).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    describe('ILOS tab', () => {
        it('does not display tabs when the ilos-submissions flag is off', async () => {
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                    ],
                },
                featureFlags: { 'ilos-submissions': false },
            })

            expect(
                await screen.findByTestId('row-test-abc-submitted')
            ).toBeInTheDocument()
            expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
            expect(
                screen.queryByRole('tab', { name: 'ILOS' })
            ).not.toBeInTheDocument()
        })

        it('displays the All submissions and ILOS tabs when the flag is on', async () => {
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexIlosSubmissionsStrippedMockSuccess(),
                    ],
                },
                routerProvider: { route: '/dashboard/submissions' },
                featureFlags: { 'ilos-submissions': true },
            })

            expect(
                await screen.findByRole('tab', { name: 'All submissions' })
            ).toHaveAttribute('aria-selected', 'true')
            expect(screen.getByRole('tab', { name: 'ILOS' })).toHaveAttribute(
                'aria-selected',
                'false'
            )
            expect(screen.getByRole('tabpanel')).toHaveAttribute(
                'data-tabname',
                'All submissions'
            )
            expect(
                screen.getByTestId('row-test-abc-submitted')
            ).toBeInTheDocument()
        })

        it('loads on the ILOS tab with the ILOS table on the ILOS dashboard route', async () => {
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexIlosSubmissionsStrippedMockSuccess([
                            mockILOSContractStripped({
                                id: 'test-ilos-submitted',
                            }),
                        ]),
                    ],
                },
                routerProvider: { route: '/dashboard/ilos' },
                featureFlags: { 'ilos-submissions': true },
            })

            expect(
                await screen.findByRole('heading', {
                    level: 2,
                    name: 'ILOS actuarial reports',
                })
            ).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'ILOS' })).toHaveAttribute(
                'aria-selected',
                'true'
            )
            expect(
                await screen.findByRole('link', { name: 'MCR-ILOS-MN-0005' })
            ).toHaveAttribute('href', '/submissions/ilos/test-ilos-submitted')
            expect(
                screen.queryByTestId('row-test-abc-submitted')
            ).not.toBeInTheDocument()
            expect(
                screen.getByRole('link', { name: 'Start new submission' })
            ).toBeInTheDocument()
        })

        it('fetches only the ILOS submissions on the ILOS tab', async () => {
            const submissionsMock = indexContractsStrippedMockSuccess([
                mockContractStripped({ id: 'test-abc-submitted' }),
            ])
            const submissionsResult = vi.fn(() => ({
                data: {
                    indexContractsStripped: {
                        totalCount: 0,
                        edges: [],
                    },
                },
            }))
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        {
                            request: submissionsMock.request,
                            result: submissionsResult,
                        },
                        indexIlosSubmissionsStrippedMockSuccess([
                            mockILOSContractStripped({
                                id: 'test-ilos-submitted',
                            }),
                        ]),
                    ],
                },
                routerProvider: { route: '/dashboard/ilos' },
                featureFlags: { 'ilos-submissions': true },
            })

            expect(
                await screen.findByTestId('row-test-ilos-submitted')
            ).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'ILOS' })).toHaveAttribute(
                'aria-selected',
                'true'
            )
            expect(submissionsResult).not.toHaveBeenCalled()
        })

        it('fetches only the submissions on the All submissions tab', async () => {
            const ilosMock = indexIlosSubmissionsStrippedMockSuccess([
                mockILOSContractStripped({ id: 'test-ilos-submitted' }),
            ])
            const ilosResult = vi.fn(() => ({
                data: {
                    indexIlosSubmissionsStripped: {
                        totalCount: 0,
                        edges: [],
                    },
                },
            }))
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        { request: ilosMock.request, result: ilosResult },
                    ],
                },
                routerProvider: { route: '/dashboard/submissions' },
                featureFlags: { 'ilos-submissions': true },
            })

            expect(
                await screen.findByTestId('row-test-abc-submitted')
            ).toBeInTheDocument()
            expect(
                screen.queryByTestId('ilos-dashboard-heading')
            ).not.toBeInTheDocument()
            expect(ilosResult).not.toHaveBeenCalled()
        })

        it('switches between the All submissions and ILOS tables when a tab is clicked', async () => {
            const user = userEvent.setup()
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        // Each tab fetches when it opens, so All submissions is asked for twice.
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexIlosSubmissionsStrippedMockSuccess([
                            mockILOSContractStripped({
                                id: 'test-ilos-submitted',
                            }),
                        ]),
                    ],
                },
                routerProvider: { route: '/dashboard/submissions' },
                featureFlags: { 'ilos-submissions': true },
            })

            await user.click(await screen.findByRole('tab', { name: 'ILOS' }))

            expect(
                await screen.findByTestId('row-test-ilos-submitted')
            ).toBeInTheDocument()
            expect(screen.getByRole('tabpanel')).toHaveAttribute(
                'data-tabname',
                'ILOS'
            )
            expect(
                screen.queryByTestId('row-test-abc-submitted')
            ).not.toBeInTheDocument()

            await user.click(
                screen.getByRole('tab', { name: 'All submissions' })
            )

            expect(
                await screen.findByTestId('row-test-abc-submitted')
            ).toBeInTheDocument()
            expect(
                screen.queryByTestId('row-test-ilos-submitted')
            ).not.toBeInTheDocument()
        })

        it('selects the tab in the URL after browser back and forward', async () => {
            const user = userEvent.setup()
            let testNavigate: NavigateFunction
            renderWithProviders(<StateDashboardNestedRoutes />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        // Each tab fetches when it opens, and each tab is opened twice.
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexContractsStrippedMockSuccess([
                            mockContractStripped({ id: 'test-abc-submitted' }),
                        ]),
                        indexIlosSubmissionsStrippedMockSuccess([
                            mockILOSContractStripped({
                                id: 'test-ilos-submitted',
                            }),
                        ]),
                        indexIlosSubmissionsStrippedMockSuccess([
                            mockILOSContractStripped({
                                id: 'test-ilos-submitted',
                            }),
                        ]),
                    ],
                },
                routerProvider: { route: '/dashboard/submissions' },
                navigate: (nav) => (testNavigate = nav),
                featureFlags: { 'ilos-submissions': true },
            })

            await user.click(await screen.findByRole('tab', { name: 'ILOS' }))
            expect(
                await screen.findByTestId('row-test-ilos-submitted')
            ).toBeInTheDocument()

            // Back
            act(() => {
                void testNavigate(-1)
            })

            expect(
                await screen.findByTestId('row-test-abc-submitted')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('tab', { name: 'All submissions' })
            ).toHaveAttribute('aria-selected', 'true')
            expect(screen.getByRole('tab', { name: 'ILOS' })).toHaveAttribute(
                'aria-selected',
                'false'
            )
            expect(screen.getByRole('tabpanel')).toHaveAttribute(
                'data-tabname',
                'All submissions'
            )

            // Forward
            act(() => {
                void testNavigate(1)
            })

            expect(
                await screen.findByTestId('row-test-ilos-submitted')
            ).toBeInTheDocument()
            expect(screen.getByRole('tab', { name: 'ILOS' })).toHaveAttribute(
                'aria-selected',
                'true'
            )
            expect(
                screen.getByRole('tab', { name: 'All submissions' })
            ).toHaveAttribute('aria-selected', 'false')
            expect(screen.getByRole('tabpanel')).toHaveAttribute(
                'data-tabname',
                'ILOS'
            )
        })
    })
})
