// eslint-disable @typescript-eslint/no-non-null-assertion
import { screen, waitFor, within } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    iterableCmsUsersMockData,
    mockMNState,
    mockUnlockedContractStripped,
    mockContractStripped,
    mockEQROContractStripped,
    indexContractsStrippedMockSuccess,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { CMSDashboard, RateReviewsDashboard, SubmissionsDashboard } from './'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
    RoutesRecord,
    ContractSubmissionTypeRecord,
} from '@mc-review/constants'

// copy paste from AppRoutes - this is to allow texting of the react router Outlet
const CMSDashboardNestedRoutes = () => (
    <Routes>
        <Route path={RoutesRecord.DASHBOARD} element={<CMSDashboard />}>
            <Route
                index
                element={<Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />}
            />
            <Route path={`submissions`} element={<SubmissionsDashboard />} />
            <Route path={'rate-reviews'} element={<RateReviewsDashboard />} />
        </Route>
    </Routes>
)

describe('CMSDashboard', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })
    afterAll(() => {
        vi.clearAllMocks()
    })

    describe.each(iterableCmsUsersMockData)(
        '$userRole CMSDashboard tests',
        ({ userRole, mockUser }) => {
            it('rate reviews feature flag - should show rate review tab when expected', () => {
                const screen = renderWithProviders(
                    <CMSDashboardNestedRoutes />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess([]),
                            ],
                        },
                        routerProvider: { route: '/dashboard/rate-reviews' },
                    }
                )

                expect(screen.getByTestId('tabs')).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', { name: 'Rate reviews' })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', { name: 'Submissions' })
                ).toBeInTheDocument()
            })

            describe(`Tests submissions tab`, () => {
                it('should display cms dashboard page', async () => {
                    const screen = renderWithProviders(
                        <CMSDashboardNestedRoutes />,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        statusCode: 200,
                                        user: mockUser(),
                                    }),
                                    indexContractsStrippedMockSuccess([]),
                                ],
                            },
                            routerProvider: { route: '/dashboard/submissions' },
                        }
                    )
                    expect(
                        screen.findByTestId('cms-dashboard-page')
                    ).not.toBeNull()
                })

                it('displays submissions table excluding any in progress drafts', async () => {
                    const draft = mockUnlockedContractStripped({
                        consolidatedStatus: 'DRAFT',
                        latestSubmittedRevision: null,
                    })
                    const submitted = mockContractStripped()
                    const unlocked = mockUnlockedContractStripped()
                    draft.id = 'test-abc-draft'
                    submitted.id = 'test-abc-submitted'
                    unlocked.id = 'test-abc-unlocked'

                    const submissions = [draft, submitted, unlocked]

                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess(submissions),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                    })

                    await screen.findByRole('heading', { name: 'Submissions' })
                    const rows = await screen.findAllByRole('row')
                    rows.shift() // remove the column header row

                    // confirm initial draft packages don't display to CMS user
                    expect(rows).toHaveLength(2)

                    rows.forEach((row) => {
                        const submissionLink = within(row).queryByRole('link')
                        expect(submissionLink).not.toHaveAttribute(
                            'href',
                            `/submissions/${ContractSubmissionTypeRecord[draft.contractSubmissionType]}/${draft.id}`
                        )
                    })
                })

                it('displays submission type as expected for current revision that is submitted/resubmitted', async () => {
                    const submitted = mockContractStripped({
                        id: '123-4',
                        latestSubmittedRevision: {
                            __typename: 'ContractRevisionStripped',
                            id: 'test-rev-123-4',
                            contractID: '123-4',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            contractName: 'MCR-MN-0005-SNBC',
                            submitInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: '2024-01-15T00:00:00.000Z',
                                updatedBy: {
                                    __typename: 'UpdatedBy',
                                    email: 'example@state.com',
                                    role: 'STATE_USER',
                                    givenName: 'John',
                                    familyName: 'Vila',
                                },
                                updatedReason: 'Initial submission',
                            },
                            unlockInfo: null,
                            formData: {
                                __typename: 'ContractFormDataStripped',
                                programIDs: [
                                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                                ],
                                populationCovered: 'MEDICAID',
                                submissionType: 'CONTRACT_ONLY',
                                contractType: 'BASE',
                                contractDateStart: new Date('2024-01-01'),
                                contractDateEnd: new Date('2025-01-01'),
                                managedCareEntities: ['MCO'],
                            },
                        },
                    })
                    const submissions = [submitted]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess(submissions),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                    })
                    await screen.findByRole('heading', { name: 'Submissions' })
                    const row = await screen.findByTestId(`row-${submitted.id}`)
                    const submissionType =
                        within(row).getByTestId('submission-type')
                    expect(submissionType).toHaveTextContent(
                        'Contract action only'
                    )
                })

                it('displays contract type as expected for current revision that is submitted/resubmitted', async () => {
                    const submitted = mockEQROContractStripped({
                        id: '123-4',
                    })
                    const submissions = [submitted]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess(submissions),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                        featureFlags: {
                            'eqro-submissions': true,
                        },
                    })
                    await screen.findByRole('heading', { name: 'Submissions' })
                    const row = await screen.findByTestId(`row-${submitted.id}`)
                    const submissionType = within(row).getByTestId(
                        'submission-contractType'
                    )
                    expect(submissionType).toHaveTextContent('EQRO')
                })

                it('displays each contract status tag as expected for current revision that is submitted/resubmitted/approved', async () => {
                    const unlocked = mockUnlockedContractStripped({
                        id: 'test-abc-unlocked',
                    })
                    const submitted = mockContractStripped({
                        id: 'test-abc-submitted',
                    })
                    const approved = mockContractStripped({
                        id: 'test-abc-approved',
                        consolidatedStatus: 'APPROVED',
                        reviewStatus: 'APPROVED',
                    })
                    // post implementation of creating default status filter for CMS users
                    // #filters= is the default hash to use no filters
                    window.location.assign('#filters=')

                    const submissions = [unlocked, submitted, approved]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess(submissions),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                    })
                    await screen.findByRole('heading', { name: 'Submissions' })
                    const unlockedRow = await screen.findByTestId(
                        `row-${unlocked.id}`
                    )
                    const tag1 =
                        within(unlockedRow).getByTestId('submission-status')
                    expect(tag1).toHaveTextContent('Unlocked')

                    const submittedRow = await screen.findByTestId(
                        `row-${submitted.id}`
                    )
                    const tag2 =
                        within(submittedRow).getByTestId('submission-status')
                    expect(tag2).toHaveTextContent('Submitted')

                    const approvedRow = await screen.findByTestId(
                        `row-${approved.id}`
                    )
                    const tag3 =
                        within(approvedRow).getByTestId('submission-status')
                    expect(tag3).toHaveTextContent('Approved')
                })

                it('displays name, type, programs and last update based on the last submitted revision for UNLOCKED package, not draft changes', async () => {
                    const mockMN = mockMNState() // this is the state used in apolloMocks
                    const unlocked = mockUnlockedContractStripped({
                        id: 'test-state-edit-in-progress-unlocked',
                        lastUpdatedForDisplay: new Date('2100-01-22'),
                        latestSubmittedRevision: {
                            __typename: 'ContractRevisionStripped',
                            id: 'test-rev-unlocked',
                            contractID: 'test-state-edit-in-progress-unlocked',
                            createdAt: new Date('2024-01-15'),
                            updatedAt: new Date('2022-01-15'),
                            contractName: 'MCR-MN-0001-MSC+-PMAP-SNBC',
                            submitInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: '2024-01-15T00:00:00.000Z',
                                updatedBy: {
                                    __typename: 'UpdatedBy',
                                    email: 'example@state.com',
                                    role: 'STATE_USER',
                                    givenName: 'John',
                                    familyName: 'Vila',
                                },
                                updatedReason: 'Initial submission',
                            },
                            unlockInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: new Date('2100-01-22'),
                                updatedBy: {
                                    __typename: 'UpdatedBy',
                                    email: 'cms@example.com',
                                    role: 'CMS_USER',
                                    givenName: 'Jane',
                                    familyName: 'CMS',
                                },
                                updatedReason: 'Unlocked for corrections',
                            },
                            formData: {
                                __typename: 'ContractFormDataStripped',
                                programIDs: [
                                    mockMN.programs[0].id,
                                    mockMN.programs[1].id,
                                    mockMN.programs[2].id,
                                ],
                                populationCovered: 'MEDICAID',
                                submissionType: 'CONTRACT_AND_RATES',
                                contractType: 'BASE',
                                contractDateStart: new Date('2024-01-01'),
                                contractDateEnd: new Date('2025-01-01'),
                                managedCareEntities: ['MCO'],
                            },
                        },
                    })

                    const submissions = [unlocked]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsStrippedMockSuccess(submissions),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                    })
                    await screen.findByRole('heading', { name: 'Submissions' })
                    const unlockedRow = await screen.findByTestId(
                        `row-${unlocked.id}`
                    )

                    // Confirm UNLOCKED status
                    const tag1 =
                        within(unlockedRow).getByTestId('submission-status')
                    expect(tag1).toHaveTextContent('Unlocked')

                    // Confirm we are using previous submitted revision type
                    const submissionType =
                        within(unlockedRow).getByTestId('submission-type')
                    expect(submissionType).toHaveTextContent(
                        'Contract action and rate certification'
                    )

                    const submissionPrograms =
                        within(unlockedRow).getAllByTestId('program-tag')
                    // Confirm we are using previous submitted revision programs
                    expect(submissionPrograms).toHaveLength(3)
                    const submissionNameLink =
                        within(unlockedRow).getByTestId('submission-id')
                    expect(submissionNameLink).toHaveTextContent(
                        'MCR-MN-0001-MSC+-PMAP-SNBC'
                    )

                    // Confirm we are using updated at from the previous submitted revision unlock info
                    const lastUpdated = within(unlockedRow).getByTestId(
                        'submission-last-updated'
                    )
                    // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
                    expect(lastUpdated).toHaveTextContent('01/21/2100')
                })

                it('should display filters on cms dashboard', async () => {
                    const unlocked = mockUnlockedContractStripped({
                        id: 'test-abc-unlocked',
                    })
                    const submitted = mockContractStripped({
                        id: 'test-abc-submitted',
                    })
                    const screen = renderWithProviders(
                        <CMSDashboardNestedRoutes />,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        statusCode: 200,
                                        user: mockUser(),
                                    }),
                                    indexContractsStrippedMockSuccess([
                                        submitted,
                                        unlocked,
                                    ]),
                                ],
                            },
                            routerProvider: { route: '/dashboard/submissions' },
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.queryByTestId('cms-dashboard-page')
                        ).toBeInTheDocument()
                        expect(
                            screen.queryByTestId('accordion')
                        ).toBeInTheDocument()
                    })
                })
            })
        }
    )
})
