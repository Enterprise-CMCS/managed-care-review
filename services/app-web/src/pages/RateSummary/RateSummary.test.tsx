import { screen, waitFor } from '@testing-library/react'
import {
    renderWithProviders,
    testS3Client,
    userClickByRole,
} from '../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    fetchContractMockSuccess,
    iterableCmsUsersMockData,
    mockValidStateUser,
    mockContractPackageSubmitted,
    rateDataMock,
    iterableNonCMSUsersMockData,
} from '@mc-review/mocks'
import { RateSummary } from './RateSummary'
import { RoutesRecord } from '@mc-review/constants'
import { Location, Route, Routes } from 'react-router-dom'
import { RateEdit } from '../RateEdit/RateEdit'
import {
    rateUnlockedWithHistoryMock,
    rateWithHistoryMock,
} from '@mc-review/mocks'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.RATES_SUMMARY} element={children} />
        </Routes>
    )
}

describe('RateSummary', () => {
    describe.each(iterableCmsUsersMockData)(
        'Viewing RateSummary as a $userRole',
        ({ userRole, mockUser }) => {
            const contract = mockContractPackageSubmitted()

            it('renders without errors', async () => {
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateMockSuccess({
                                id: '7a',
                                parentContractID: contract.id,
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                expect(
                    await screen.findByText(
                        'Rates this rate certification covers'
                    )
                ).toBeInTheDocument()
            })

            it('displays withdrawn banner on a withdrawn rate', async () => {
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateMockSuccess({
                                id: '1337',
                                parentContractID: contract.id,
                                withdrawInfo: {
                                    __typename: 'UpdateInformation',
                                    updatedAt: new Date('2024-01-01'),
                                    updatedBy: {
                                        email: 'admin@example.com',
                                        role: 'ADMIN_USER',
                                        familyName: 'Hotman',
                                        givenName: 'Iroh',
                                    },
                                    updatedReason:
                                        'Admin as withdrawn this rate.',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/1337',
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                })

                await waitFor(() => {
                    expect(
                        screen.queryByTestId('rate-summary')
                    ).toBeInTheDocument()
                })

                expect(
                    await screen.findByText(
                        'Rates this rate certification covers'
                    )
                ).toBeInTheDocument()

                expect(screen.getByRole('alert')).toHaveClass('usa-alert--info')
                expect(
                    screen.getByTestId('rateWithdrawnBanner')
                ).toHaveTextContent(/Withdrawn by: Administrator/)
                // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
                expect(
                    screen.getByText('12/31/2023 4:00pm PT')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Admin as withdrawn this rate.')
                ).toBeInTheDocument()
            })

            it('renders document download warning banner when download fails', async () => {
                const error = vi
                    .spyOn(console, 'error')
                    .mockImplementation(vi.fn())

                const s3Provider = {
                    ...testS3Client(),
                    getBulkDlURL: async (
                        keys: string[],
                        fileName: string
                    ): Promise<string | Error> => {
                        return new Error(
                            'Error: getBulkDlURL encountered an error'
                        )
                    },
                }
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                id: '7a',
                                parentContractID: contract.id,
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    s3Provider,
                })

                await waitFor(() => {
                    expect(
                        screen.getByTestId('warning-alert')
                    ).toBeInTheDocument()
                    expect(screen.getByTestId('warning-alert')).toHaveClass(
                        'usa-alert--warning'
                    )
                    expect(
                        screen.getByTestId('warning-alert')
                    ).toHaveTextContent('Document download unavailable')
                    expect(error).toHaveBeenCalled()
                })
            })

            it('renders unlock and withdraw buttons', async () => {
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                id: '7a',
                                parentContractID: contract.id,
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    featureFlags: {
                        'rate-edit-unlock': true,
                        'withdraw-rate': true,
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.queryByRole('link', { name: 'Withdraw rate' })
                    ).toBeInTheDocument()
                    expect(
                        screen.queryByRole('button', { name: 'Unlock rate' })
                    ).toBeInTheDocument()
                })
            })

            it('renders unlock button that redirects to contract submission page when linked rates on but standalone rate edit and unlock is still disabled', async () => {
                let testLocation: Location // set up location to track URL changes
                const rateData = rateWithHistoryMock()
                rateData.parentContractID = contract.id

                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<div>Summary page placeholder</div>}
                        />
                        <Route
                            path={RoutesRecord.RATES_SUMMARY}
                            element={<RateSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchRateMockSuccess({
                                    ...rateData,
                                    id: '7a',
                                }),
                                fetchContractMockSuccess({ contract }),
                            ],
                        },
                        routerProvider: {
                            route: '/rates/7a',
                        },
                        location: (location) => (testLocation = location),
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.queryByRole('button', { name: 'Unlock rate' })
                    ).toBeInTheDocument()
                })

                await userClickByRole(screen, 'button', {
                    name: 'Unlock rate',
                })
                await waitFor(() => {
                    const parentContractSubmissionID = rateData.parentContractID
                    expect(testLocation.pathname).toBe(
                        `/submissions/${parentContractSubmissionID}`
                    )
                })
            })

            it('does not render unlock button when linked rates on but standalone rate edit and unlock is still disabled if the associated contract is approved', async () => {
                const rateData = rateWithHistoryMock()
                rateData.parentContractID = contract.id

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                ...rateData,
                                id: '7a',
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                const unlockRateBtn = await screen.queryByRole('button', {
                    name: 'Unlock rate',
                })
                expect(unlockRateBtn).not.toBeInTheDocument()
            })
            it('disables the unlock button for CMS users when rate already unlocked', async () => {
                const rateData = rateUnlockedWithHistoryMock()
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                ...rateData,
                                id: '7a',
                                parentContractID: contract.id,
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    featureFlags: {
                        'rate-edit-unlock': true,
                        'withdraw-rate': true,
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.getByRole('button', {
                            name: 'Unlock rate',
                        })
                    ).toHaveAttribute('aria-disabled', 'true')
                })
            })
            it('should not display unlock rate button if parent contract has been approved', async () => {
                const rate = rateDataMock()

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                ...rate,
                                id: '7a',
                                parentContractID: contract.id,
                                status: 'SUBMITTED',
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...contract,
                                    reviewStatus: 'APPROVED',
                                    consolidatedStatus: 'APPROVED',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                })

                // Wait for all the documents to be in the table
                await screen.findByText(
                    rate.revisions[0].formData.rateDocuments[0].name
                )
                await screen.findByRole('link', {
                    name: 'Download all rate documents',
                })

                expect(
                    screen.queryByRole('link', { name: 'Unlock rate' })
                ).not.toBeInTheDocument()
            })

            it('should not display withdraw rate button if rate is unlocked', async () => {
                const rate = rateDataMock()

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                ...rate,
                                id: '7a',
                                parentContractID: contract.id,
                                status: 'UNLOCKED',
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...contract,
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                })

                // Wait for all the documents to be in the table
                await screen.findByText(
                    rate.revisions[0].formData.rateDocuments[0].name
                )
                await screen.findByRole('link', {
                    name: 'Download all rate documents',
                })

                expect(
                    screen.queryByRole('link', { name: 'Withdraw rate' })
                ).not.toBeInTheDocument()
            })
        }
    )

    describe('Viewing RateSummary as a State user', () => {
        const contract = mockContractPackageSubmitted()

        it('renders SingleRateSummarySection component without errors for locked rate', async () => {
            const rate = rateWithHistoryMock()
            rate.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess(rate),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/r-01',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })

            await waitFor(() => {
                expect(screen.queryByTestId('rate-summary')).toBeInTheDocument()
            })

            expect(
                await screen.findByText('Rates this rate certification covers')
            ).toBeInTheDocument()
        })

        it('displays withdrawn banner on a withdrawn rate', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateMockSuccess({
                            id: '1337',
                            parentContractID: contract.id,
                            withdrawInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: new Date('2024-01-01'),
                                updatedBy: {
                                    email: 'admin@example.com',
                                    role: 'ADMIN_USER',
                                    familyName: 'Hotman',
                                    givenName: 'Iroh',
                                },
                                updatedReason: 'Admin as withdrawn this rate.',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })

            await waitFor(() => {
                expect(screen.queryByTestId('rate-summary')).toBeInTheDocument()
            })

            expect(
                await screen.findByText('Rates this rate certification covers')
            ).toBeInTheDocument()

            expect(screen.getByRole('alert')).toHaveClass('usa-alert--info')
            expect(screen.getByTestId('rateWithdrawnBanner')).toHaveTextContent(
                /Withdrawn by: Administrator/
            )
            // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
            expect(screen.getByText('12/31/2023 4:00pm PT')).toBeInTheDocument()
            expect(
                screen.getByText('Admin as withdrawn this rate.')
            ).toBeInTheDocument()
        })

        it('redirects to RateEdit component from RateSummary without errors for unlocked rate', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.RATE_EDIT}
                        element={<RateEdit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                id: '1337',
                                parentContractID: contract.id,
                                status: 'UNLOCKED',
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/1337',
                    },
                    featureFlags: {
                        'rate-edit-unlock': true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.queryByTestId('single-rate-edit')
                ).toBeInTheDocument()
            })
        })

        it('renders expected error page when rate ID is invalid', async () => {
            const consoleWarnMock = vi
                .spyOn(console, 'warn')
                .mockImplementation(vi.fn())

            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: '1337',
                            parentContractID: contract.id,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                //purposefully attaching invalid id to url here
                routerProvider: {
                    route: '/rates/133',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })
            expect(consoleWarnMock).toHaveBeenCalled() // apollo testing mocks will console warn that your query is invalid - this is intentional
            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('renders back to dashboard link for state users', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            id: '7a',
                            parentContractID: contract.id,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })

            const backLink = await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
            expect(backLink).toBeInTheDocument()

            expect(backLink).toHaveAttribute('href', '/dashboard')
        })

        it.each(iterableNonCMSUsersMockData)(
            'does not render actions section with buttons to $userRole',
            async ({ mockUser }) => {
                const rate = rateDataMock()

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                ...rate,
                                id: '7a',
                                parentContractID: contract.id,
                                status: 'SUBMITTED',
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...contract,
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                    featureFlags: {
                        'rate-edit-unlock': true,
                        'withdraw-rate': true,
                    },
                })

                // Wait for rate name to be on screen
                await screen.findByText(
                    rate.revisions[0].formData.rateDocuments[0].name
                )

                expect(
                    screen.queryByRole('heading', { name: 'Actions' })
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByRole('link', { name: 'Withdraw rate' })
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByRole('link', { name: 'Unlock rate' })
                ).not.toBeInTheDocument()
            }
        )
    })
})
