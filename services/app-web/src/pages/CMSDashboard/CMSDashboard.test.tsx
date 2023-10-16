import { screen, waitFor, within } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
    mockDraftHealthPlanPackage,
    mockMNState,
    mockSubmittedHealthPlanPackage,
    mockUnlockedHealthPlanPackage,
    mockValidCMSUser,
} from '../../testHelpers/apolloMocks'
import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { CMSDashboard, RateReviewsDashboard, SubmissionsDashboard } from './'
import {
    FeatureFlagLDConstant,
    FlagValue,
} from '../../common-code/featureFlags'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../constants'

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
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })
    it('rate reviews feature flag - should show rate review tab when expected', () => {
        ldUseClientSpy({ 'rate-reviews-dashboard': true })
        const screen = renderWithProviders(<CMSDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidCMSUser(),
                    }),
                    indexHealthPlanPackagesMockSuccess([]),
                ],
            },
            routerProvider: { route: '/dashboard/rate-reviews' },
        })

        expect(screen.getByTestId('tabs')).toBeInTheDocument()
        expect(
            screen.getByRole('heading', { name: 'Rate reviews' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('heading', { name: 'Submissions' })
        ).toBeInTheDocument()
    })

    // delete this test when flag is removed
    it('rate reviews feature flag - should hide rate review tab when expected', () => {
        ldUseClientSpy({ 'rate-reviews-dashboard': false })
        const screen = renderWithProviders(<CMSDashboardNestedRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidCMSUser(),
                    }),
                    indexHealthPlanPackagesMockSuccess([]),
                ],
            },
            routerProvider: { route: '/dashboard/rate-reviews' },
        })

        expect(screen.queryByTestId('tabs')).toBeNull()
        expect(
            screen.queryByRole('heading', { name: 'Rate reviews' })
        ).toBeNull()
    })

    const flagValueTestParameters: {
        flagName: FeatureFlagLDConstant
        flagValue: FlagValue
        testName: string
    }[] = [
        {
            flagName: 'rate-reviews-dashboard',
            flagValue: false,
            testName: 'submissions tab - Rate reviews feature flag off',
        },
        {
            flagName: 'rate-reviews-dashboard',
            flagValue: true,
            testName: 'submissions tab - Rate reviews feature flag on',
        },
    ]
    describe.each(flagValueTestParameters)(
        `Tests $testName`,
        ({ flagName, flagValue }) => {
            ldUseClientSpy({ [flagName]: flagValue })

            it('should display cms dashboard page', async () => {
                const screen = renderWithProviders(
                    <CMSDashboardNestedRoutes />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockValidCMSUser(),
                                }),
                                indexHealthPlanPackagesMockSuccess([]),
                            ],
                        },
                        routerProvider: { route: '/dashboard/submissions' },
                    }
                )
                expect(screen.findByTestId('cms-dashboard-page')).not.toBeNull()
            })

            it('displays submissions table excluding any in progress drafts', async () => {
                const draft = mockDraftHealthPlanPackage()
                const submitted = mockSubmittedHealthPlanPackage()
                const unlocked = mockUnlockedHealthPlanPackage()
                draft.id = 'test-abc-draft'
                submitted.id = 'test-abc-submitted'
                unlocked.id = 'test-abc-unlocked'

                const submissions = [draft, submitted, unlocked]

                renderWithProviders(<CMSDashboardNestedRoutes />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                            indexHealthPlanPackagesMockSuccess(submissions),
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
                const submitted = mockSubmittedHealthPlanPackage()
                submitted.id = '123-4'
                const submissions = [submitted]
                renderWithProviders(<CMSDashboardNestedRoutes />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                            indexHealthPlanPackagesMockSuccess(submissions),
                        ],
                    },
                    routerProvider: { route: '/dashboard/submissions' },
                })
                await screen.findByRole('heading', { name: 'Submissions' })
                const row = await screen.findByTestId(`row-${submitted.id}`)
                const submissionType =
                    within(row).getByTestId('submission-type')
                expect(submissionType).toHaveTextContent('Contract action only')
            })

            it('displays each health plan package status tag as expected for current revision that is submitted/resubmitted', async () => {
                const unlocked = mockUnlockedHealthPlanPackage()
                const submitted = mockSubmittedHealthPlanPackage()
                submitted.id = 'test-abc-submitted'
                unlocked.id = 'test-abc-unlocked'

                const submissions = [unlocked, submitted]
                renderWithProviders(<CMSDashboardNestedRoutes />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                            indexHealthPlanPackagesMockSuccess(submissions),
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

                // Set new data on the unlocked form. This would be a state users update and the CMS user should not see this data.
                const unlocked = mockUnlockedHealthPlanPackage(
                    {
                        submissionType: 'CONTRACT_ONLY',
                        updatedAt: new Date('2022-01-15'),
                        programIDs: [mockMN.programs[2].id],
                    },
                    { updatedAt: new Date('2100-01-22') }
                )
                unlocked.id = 'test-state-edit-in-progress-unlocked'

                const submissions = [unlocked]
                renderWithProviders(<CMSDashboardNestedRoutes />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                            indexHealthPlanPackagesMockSuccess(submissions),
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
                expect(submissionNameLink).toHaveTextContent('MSC+-PMAP-SNBC')

                // Confirm we are using updated at from the previous submitted revision unlock info
                const lastUpdated = within(unlockedRow).getByTestId(
                    'submission-last-updated'
                )
                expect(lastUpdated).toHaveTextContent('01/22/2100')
            })

            it('should display filters on cms dashboard', async () => {
                const unlocked = mockUnlockedHealthPlanPackage()
                const submitted = mockSubmittedHealthPlanPackage()
                submitted.id = 'test-abc-submitted'
                unlocked.id = 'test-abc-unlocked'
                const screen = renderWithProviders(
                    <CMSDashboardNestedRoutes />,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockValidCMSUser(),
                                }),
                                indexHealthPlanPackagesMockSuccess([
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
        }
    )
})
