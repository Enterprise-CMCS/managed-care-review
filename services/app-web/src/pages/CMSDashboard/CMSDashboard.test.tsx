// eslint-disable @typescript-eslint/no-non-null-assertion
import { screen, waitFor, within } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    iterableCmsUsersMockData,
    mockMNState,
    indexContractsMockSuccess,
    mockContractPackageUnlockedWithUnlockedType,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { CMSDashboard, RateReviewsDashboard, SubmissionsDashboard } from './'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../constants'
import { Contract } from '../../gen/gqlClient'

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
                                indexContractsMockSuccess([]),
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
                                    indexContractsMockSuccess([]),
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
                    const draft = mockContractPackageDraft()
                    const submitted = mockContractPackageSubmitted()
                    const unlocked: Contract = {
                        ...mockContractPackageUnlockedWithUnlockedType(),
                        __typename: 'Contract',
                    }
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
                                indexContractsMockSuccess(submissions),
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
                            `/submissions/${draft.id}`
                        )
                    })
                })

                it('displays submission type as expected for current revision that is submitted/resubmitted', async () => {
                    const submitted = mockContractPackageSubmitted()
                    submitted.id = '123-4'
                    submitted.packageSubmissions[0].contractRevision.formData.submissionType =
                        'CONTRACT_ONLY'
                    const submissions = [submitted]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsMockSuccess(submissions),
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

                it('displays each contract status tag as expected for current revision that is submitted/resubmitted', async () => {
                    const unlocked: Contract = {
                        ...mockContractPackageUnlockedWithUnlockedType(),
                        __typename: 'Contract',
                    }
                    const submitted = mockContractPackageSubmitted()
                    submitted.id = 'test-abc-submitted'
                    unlocked.id = 'test-abc-unlocked'

                    const submissions = [unlocked, submitted]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsMockSuccess(submissions),
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
                })

                it('displays name, type, programs and last update based on previously submitted revision for UNLOCKED package', async () => {
                    const mockMN = mockMNState() // this is the state used in apolloMocks
                    const unlocked: Contract = {
                        ...mockContractPackageUnlockedWithUnlockedType(),
                        __typename: 'Contract',
                    }
                    // Set new data on the unlocked form. This would be a state users update and the CMS user should not see this data.
                    unlocked.draftRevision!.formData.submissionType =
                        'CONTRACT_AND_RATES'
                    unlocked.draftRevision!.formData.programIDs = [
                        mockMN.programs[0].id,
                        mockMN.programs[1].id,
                        mockMN.programs[2].id,
                    ]
                    unlocked.draftRevision!.updatedAt = new Date('2022-01-15')
                    unlocked.draftRevision!.unlockInfo!.updatedAt = new Date(
                        '2100-01-22'
                    )

                    unlocked.id = 'test-state-edit-in-progress-unlocked'

                    const submissions = [unlocked]
                    renderWithProviders(<CMSDashboardNestedRoutes />, {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                indexContractsMockSuccess(submissions),
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
                        'MCR-MN-0005-SNBC'
                    )

                    // Confirm we are using updated at from the previous submitted revision unlock info
                    const lastUpdated = within(unlockedRow).getByTestId(
                        'submission-last-updated'
                    )
                    // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
                    expect(lastUpdated).toHaveTextContent('01/21/2100')
                })

                it('should display filters on cms dashboard', async () => {
                    const unlocked: Contract = {
                        ...mockContractPackageUnlockedWithUnlockedType(),
                        __typename: 'Contract',
                    }
                    const submitted = mockContractPackageSubmitted()
                    submitted.id = 'test-abc-submitted'
                    unlocked.id = 'test-abc-unlocked'
                    const screen = renderWithProviders(
                        <CMSDashboardNestedRoutes />,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        statusCode: 200,
                                        user: mockUser(),
                                    }),
                                    indexContractsMockSuccess([
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
