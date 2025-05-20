import { screen, waitFor } from '@testing-library/react'
import {
    renderWithProviders,
    testS3Client,
    userClickByRole,
} from '../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchRateWithQuestionsMockSuccess,
    fetchContractMockSuccess,
    iterableCmsUsersMockData,
    mockValidStateUser,
    mockContractPackageSubmitted,
    rateDataMock,
    iterableNonCMSUsersMockData,
    mockValidCMSUser,
    mockRateSubmittedWithQuestions,
} from '@mc-review/mocks'
import { RateSummary } from './RateSummary'
import { RoutesRecord } from '@mc-review/constants'
import { Location, Route, Routes } from 'react-router-dom'
import { RateEdit } from '../RateEdit/RateEdit'
import { rateWithHistoryMock } from '@mc-review/mocks'

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
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '7a',
                                    parentContractID: contract.id,
                                },
                            }),
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

            it('displays withdrawn banner on a independently withdrawn rate', async () => {
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '1337',
                                    status: 'SUBMITTED',
                                    consolidatedStatus: 'WITHDRAWN',
                                    parentContractID: contract.id,
                                    withdrawnFromContracts: [contract],
                                    reviewStatusActions: [
                                        {
                                            rateID: '1337',
                                            actionType: 'WITHDRAW',
                                            updatedAt: new Date('2024-01-01'),
                                            updatedReason:
                                                'Withdraw only the rate',
                                            updatedBy: {
                                                email: 'someone@example.com',
                                                familyName: 'one',
                                                givenName: 'some',
                                                role: 'CMS_USER',
                                            },
                                        },
                                    ],
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/1337',
                    },
                    featureFlags: {
                        'undo-withdraw-rate': true,
                    },
                })

                await waitFor(() => {
                    expect(screen.queryByRole('alert')).toBeInTheDocument()
                })

                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Status: Withdrawn/
                )
                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Updated by: someone@example.com/
                )
                // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
                expect(
                    screen.getByText('12/31/2023 4:00pm PT')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Withdraw only the rate')
                ).toBeInTheDocument()
            })

            it('displays withdrawn banner on a rate withdrawn with parent contract', async () => {
                const withdrawnContract = mockContractPackageSubmitted()

                withdrawnContract.reviewStatusActions = [
                    {
                        contractID: withdrawnContract.id,
                        actionType: 'WITHDRAW',
                        updatedAt: new Date('2024-01-01'),
                        updatedReason: 'Withdraw whole submission',
                        updatedBy: {
                            email: 'someone@example.com',
                            familyName: 'one',
                            givenName: 'some',
                            role: 'CMS_USER',
                        },
                    },
                ]
                withdrawnContract.consolidatedStatus = 'WITHDRAWN'

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({
                                contract: withdrawnContract,
                            }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '1337',
                                    status: 'SUBMITTED',
                                    consolidatedStatus: 'WITHDRAWN',
                                    parentContractID: withdrawnContract.id,
                                    withdrawnFromContracts: [],
                                    reviewStatusActions: [
                                        {
                                            rateID: '1337',
                                            actionType: 'WITHDRAW',
                                            updatedAt: new Date('2024-01-01'),
                                            updatedReason:
                                                'Withdraw whole submission',
                                            updatedBy: {
                                                email: 'someone@example.com',
                                                familyName: 'one',
                                                givenName: 'some',
                                                role: 'CMS_USER',
                                            },
                                        },
                                    ],
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/1337',
                    },
                    featureFlags: {
                        'undo-withdraw-rate': true,
                    },
                })

                await waitFor(() => {
                    expect(screen.queryByRole('alert')).toBeInTheDocument()
                })

                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Status: Withdrawn/
                )
                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Updated by: someone@example.com/
                )
                // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
                expect(
                    screen.getByText('12/31/2023 4:00pm PT')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Withdraw whole submission')
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
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '7a',
                                    parentContractID: contract.id,
                                },
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
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rateData,
                                        id: '7a',
                                    },
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

            it('does not render unlock button on linked rate, but standalone rate edit and unlock is still disabled if the associated contract is approved', async () => {
                const rateData = rateWithHistoryMock()
                rateData.parentContractID = contract.id

                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    ...rateData,
                                    id: '7a',
                                },
                            }),
                            fetchContractMockSuccess({ contract }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.queryByRole('button', {
                            name: 'Unlock rate',
                        })
                    ).not.toBeInTheDocument()
                })
            })

            it('renders missing contract action text on orphaned rate', async () => {
                const rate = rateWithHistoryMock()
                const latestPkgSub = rate.packageSubmissions?.[0]
                if (!latestPkgSub)
                    throw new Error(
                        'Unexpected error: Expected rate to have a package submission.'
                    )
                rate.id = '7a'
                rate.parentContractID = contract.id
                rate.withdrawnFromContracts = []
                rate.packageSubmissions = [
                    {
                        ...latestPkgSub,
                        contractRevisions: [],
                    },
                ]
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateWithQuestionsMockSuccess({
                                rate,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.getByTestId('error-alert')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('Missing contract action')
                    ).toBeInTheDocument()
                })
            })

            it('renders missing contract action text on withdrawn orphaned rate', async () => {
                const rate = rateWithHistoryMock()
                const latestPkgSub = rate.packageSubmissions?.[0]
                if (!latestPkgSub)
                    throw new Error(
                        'Unexpected error: Expected rate to have a package submission.'
                    )

                rate.id = '7a'
                rate.parentContractID = contract.id
                rate.withdrawnFromContracts = []
                rate.consolidatedStatus = 'WITHDRAWN'
                rate.packageSubmissions = [
                    {
                        ...latestPkgSub,
                        contractRevisions: [],
                    },
                ]
                rate.reviewStatusActions = [
                    {
                        rateID: '7a',
                        actionType: 'WITHDRAW',
                        updatedAt: new Date('2024-01-01'),
                        updatedReason: 'Withdraw only the rate',
                        updatedBy: {
                            email: 'someone@example.com',
                            familyName: 'one',
                            givenName: 'some',
                            role: 'CMS_USER',
                        },
                    },
                ]
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateWithQuestionsMockSuccess({
                                rate,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.getByTestId('error-alert')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByTestId('rateWithdrawBanner')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('Missing contract action')
                    ).toBeInTheDocument()
                })
            })

            it('does not render missing contract action text on withdrawn rate', async () => {
                const rate = rateWithHistoryMock()
                const latestPkgSub = rate.packageSubmissions?.[0]
                if (!latestPkgSub)
                    throw new Error(
                        'Unexpected error: Expected rate to have a package submission.'
                    )
                renderWithProviders(wrapInRoutes(<RateSummary />), {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser(),
                                statusCode: 200,
                            }),
                            fetchContractMockSuccess({ contract }),
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '7a',
                                    status: 'SUBMITTED',
                                    consolidatedStatus: 'WITHDRAWN',
                                    parentContractID: contract.id,
                                    withdrawnFromContracts: [contract],
                                    reviewStatusActions: [
                                        {
                                            rateID: '1337',
                                            actionType: 'WITHDRAW',
                                            updatedAt: new Date('2024-01-01'),
                                            updatedReason:
                                                'Withdraw only the rate',
                                            updatedBy: {
                                                email: 'someone@example.com',
                                                familyName: 'one',
                                                givenName: 'some',
                                                role: 'CMS_USER',
                                            },
                                        },
                                    ],
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/7a',
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.getByTestId('rateWithdrawBanner')
                    ).toBeInTheDocument()
                })

                expect(
                    screen.queryByTestId('error-alert')
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByText('Missing contract action')
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
                        fetchRateWithQuestionsMockSuccess({ rate }),
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
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    id: '1337',
                                    parentContractID: contract.id,
                                    status: 'UNLOCKED',
                                },
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
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                parentContractID: contract.id,
                            },
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
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '7a',
                                parentContractID: contract.id,
                            },
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
                            fetchRateWithQuestionsMockSuccess({
                                rate: {
                                    ...rate,
                                    id: '7a',
                                    parentContractID: contract.id,
                                    status: 'SUBMITTED',
                                },
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
                    screen.queryByRole('button', { name: 'Withdraw rate' })
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByRole('link', { name: 'Unlock rate' })
                ).not.toBeInTheDocument()
            }
        )
    })

    describe('Action section tests', () => {
        it('renders unlock and withdraw buttons', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'SUBMITTED',
            })
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '7a',
                                parentContractID: contract.id,
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.queryByRole('button', { name: 'Withdraw rate' })
                ).toBeInTheDocument()
                expect(
                    screen.queryByRole('button', { name: 'Undo withdraw' })
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByRole('button', { name: 'Unlock rate' })
                ).toBeInTheDocument()
            })
        })
        it('renders withdraw rate on orphaned rates', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'SUBMITTED',
            })
            const rateData = mockRateSubmittedWithQuestions({
                id: '1337',
                status: 'UNLOCKED',
                consolidatedStatus: 'UNLOCKED',
                parentContractID: contract.id,
                withdrawnFromContracts: [],
                reviewStatusActions: [],
            })

            const latestPackageSubmission = rateData.packageSubmissions?.[0]

            if (!latestPackageSubmission) {
                throw new Error(
                    'Unexpected error: mock rate data had no packageSubmissions'
                )
            }

            // Remove associated contracts
            rateData.packageSubmissions = [
                {
                    ...latestPackageSubmission,
                    contractRevisions: [],
                },
            ]

            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: rateData,
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: 'Withdraw rate' })
                ).toBeInTheDocument()
            })
        })
        it('renders no actions message when rate is withdrawn with submission', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'WITHDRAWN',
            })
            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                parentContractID: contract.id,
                                consolidatedStatus: 'WITHDRAWN',
                                withdrawnFromContracts: [],
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'No action can be taken on this submission in its current status.'
                    )
                ).toBeInTheDocument()
            })
        })
        it('renders no actions message when rate when submission is approved', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'APPROVED',
            })

            contract.reviewStatusActions = [
                {
                    contractID: contract.id,
                    updatedReason: 'Approved submission',
                    updatedBy: {
                        email: 'someone@example.com',
                        familyName: 'one',
                        givenName: 'some',
                        role: 'CMS_USER',
                    },
                    updatedAt: new Date(),
                    actionType: 'MARK_AS_APPROVED',
                },
            ]

            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                parentContractID: contract.id,
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'No action can be taken on this submission in its current status.'
                    )
                ).toBeInTheDocument()
            })
        })
        it('renders no actions message when rate when unlocked', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'UNLOCKED',
            })
            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                status: 'UNLOCKED',
                                consolidatedStatus: 'UNLOCKED',
                                parentContractID: contract.id,
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'No action can be taken on this submission in its current status.'
                    )
                ).toBeInTheDocument()
            })
        })
        it('renders no actions message when parent contract is unlocked', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'UNLOCKED',
            })
            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                status: 'SUBMITTED',
                                consolidatedStatus: 'SUBMITTED',
                                parentContractID: contract.id,
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'No action can be taken on this submission in its current status.'
                    )
                ).toBeInTheDocument()
            })
        })
        it('renders undo withdraw button when withdrawn independently', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'SUBMITTED',
            })
            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                status: 'SUBMITTED',
                                consolidatedStatus: 'WITHDRAWN',
                                parentContractID: contract.id,
                                withdrawnFromContracts: [contract],
                                reviewStatusActions: [
                                    {
                                        rateID: '1337',
                                        actionType: 'WITHDRAW',
                                        updatedAt: new Date(),
                                        updatedReason: 'Independent withdraw',
                                        updatedBy: {
                                            email: 'someone@example.com',
                                            familyName: 'one',
                                            givenName: 'some',
                                            role: 'CMS_USER',
                                        },
                                    },
                                ],
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            })

            await waitFor(() => {
                expect(screen.queryByRole('alert')).toBeInTheDocument()
                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Status: Withdrawn/
                )

                expect(
                    screen.getByRole('button', { name: 'Undo withdraw' })
                ).toBeInTheDocument()

                expect(
                    screen.queryByRole('button', { name: 'Withdraw rate' })
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByRole('button', { name: 'Unlock rate' })
                ).not.toBeInTheDocument()
            })
        })
        it('does not render undo withdraw and unlock rate button when withdrawn button is on screen', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'SUBMITTED',
            })
            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                status: 'SUBMITTED',
                                consolidatedStatus: 'SUBMITTED',
                                parentContractID: contract.id,
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.queryByRole('button', { name: 'Undo withdraw' })
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByRole('button', { name: 'Withdraw rate' })
                ).toBeInTheDocument()

                expect(
                    screen.queryByRole('button', { name: 'Unlock rate' })
                ).toBeInTheDocument()
            })
        })
        it('does not render undo withdraw and unlock button when parent submission is withdrawn', async () => {
            const contract = mockContractPackageSubmitted({
                consolidatedStatus: 'WITHDRAWN',
            })

            contract.reviewStatusActions = [
                {
                    contractID: contract.id,
                    actionType: 'WITHDRAW',
                    updatedAt: new Date(),
                    updatedReason: 'Contract withdraw',
                    updatedBy: {
                        email: 'someone@example.com',
                        familyName: 'one',
                        givenName: 'some',
                        role: 'CMS_USER',
                    },
                },
            ]

            const rateData = rateWithHistoryMock()
            rateData.parentContractID = contract.id
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({ contract }),
                        fetchRateWithQuestionsMockSuccess({
                            rate: {
                                id: '1337',
                                status: 'SUBMITTED',
                                consolidatedStatus: 'WITHDRAWN',
                                parentContractID: contract.id,
                                withdrawnFromContracts: [contract],
                                reviewStatusActions: [
                                    {
                                        rateID: '1337',
                                        actionType: 'WITHDRAW',
                                        updatedAt: new Date(),
                                        updatedReason: 'Independent withdraw',
                                        updatedBy: {
                                            email: 'someone@example.com',
                                            familyName: 'one',
                                            givenName: 'some',
                                            role: 'CMS_USER',
                                        },
                                    },
                                ],
                            },
                        }),
                        fetchContractMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: {
                    'undo-withdraw-rate': true,
                },
            })

            await waitFor(() => {
                expect(screen.queryByRole('alert')).toBeInTheDocument()
                expect(screen.queryByRole('alert')).toHaveTextContent(
                    /Status: Withdrawn/
                )
            })

            expect(
                screen.queryByRole('button', { name: 'Undo withdraw' })
            ).not.toBeInTheDocument()

            expect(
                screen.queryByRole('button', { name: 'Unlock rate' })
            ).not.toBeInTheDocument()
        })
    })
})
