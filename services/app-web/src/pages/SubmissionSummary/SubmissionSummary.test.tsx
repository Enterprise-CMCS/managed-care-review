import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    mockValidUser,
    mockValidStateUser,
    mockContractPackageSubmitted,
    mockContractPackageSubmittedWithQuestions,
    iterableCmsUsersMockData,
    mockValidCMSUser,
    mockContractPackageApproved,
    iterableAdminUsersMockData,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSummary } from './SubmissionSummary'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { testS3Client } from '../../testHelpers'
import { mockContractPackageUnlockedWithUnlockedType } from '@mc-review/mocks'
import { ReviewSubmit } from '../StateSubmission/ReviewSubmit'
import { generatePath, Location } from 'react-router-dom'
import { dayjs } from '@mc-review/dates'

describe('SubmissionSummary', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole SubmissionSummary tests',
        ({ mockUser }) => {
            it('renders submission unlocked banner for CMS user', async () => {
                const contract = mockContractPackageUnlockedWithUnlockedType({
                    id: 'test-abc-123',
                })

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )
                await waitFor(() => {
                    expect(
                        screen.getByTestId('unlockedBanner')
                    ).toBeInTheDocument()
                    expect(screen.getByTestId('unlockedBanner')).toHaveClass(
                        'usa-alert--warning'
                    )
                    expect(
                        screen.getByTestId('unlockedBanner')
                    ).toHaveTextContent(
                        /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ PT/i
                    )
                    expect(
                        screen.getByTestId('unlockedBanner')
                    ).toHaveTextContent('by: cms@example.com')
                    expect(
                        screen.getByTestId('unlockedBanner')
                    ).toHaveTextContent(
                        'Reason for unlock: unlocked for a test'
                    )
                })
            })

            it('pulls the right version of UNLOCKED data for CMS users', async () => {
                const contract = mockContractPackageUnlockedWithUnlockedType({
                    id: 'test-abc-123',
                })

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract: {
                                        ...contract,
                                        id: 'test-abc-123',
                                    },
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract: {
                                        ...contract,
                                        id: 'test-abc-123',
                                    },
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                expect(
                    await screen.findByText('MCR-MN-0005-SNBC')
                ).toBeInTheDocument()

                const description = await screen.findByLabelText(
                    'Submission description'
                )
                expect(description).toHaveTextContent('An initial submission')
                const ratingPeriod = await screen.findByLabelText(
                    'Rating period of original rate certification'
                )
                expect(ratingPeriod).toHaveTextContent(
                    '01/01/2020 to 01/01/2021'
                )
            })

            it('displays the legacy shared rates across submissions UI for CMS users when unlocked', async () => {
                const contract = mockContractPackageUnlockedWithUnlockedType({
                    id: 'test-abc-123',
                })

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                expect(await screen.findByText('SHARED')).toBeInTheDocument()
                expect(
                    await screen.findByText('Linked submissions')
                ).toBeInTheDocument()
            })

            it('renders add mccrs-id link for CMS user', async () => {
                const contract =
                    mockContractPackageSubmittedWithQuestions('test-abc-123')

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser(),
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )
                await waitFor(() => {
                    expect(
                        screen.getByText('Add MC-CRS record number')
                    ).toBeInTheDocument()
                })
            })

            it('renders edit mccrs-id link for CMS user when submission has a mccrs id', async () => {
                const contract = mockContractPackageSubmittedWithQuestions(
                    'test-abc-123',
                    {
                        mccrsID: '1234',
                    }
                )
                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract: {
                                        ...contract,
                                        mccrsID: '3333',
                                    },
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )
                await waitFor(() => {
                    expect(
                        screen.queryByText('Add MC-CRS record number')
                    ).not.toBeInTheDocument()
                    expect(
                        screen.getByText('Edit MC-CRS number')
                    ).toBeInTheDocument()
                })
            })

            it('renders document download warning banner', async () => {
                const s3Provider = {
                    ...testS3Client(),
                    getBulkDlURL: async (
                        _keys: string[],
                        _fileName: string
                    ): Promise<string | Error> => {
                        return new Error(
                            'Error: getBulkDlURL encountered an error'
                        )
                    },
                }
                const contract = mockContractPackageSubmitted({
                    id: 'test-abc-123',
                })
                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                        s3Provider,
                    }
                )

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
                })
            })

            it('renders back to dashboard link for CMS users', async () => {
                const contract = mockContractPackageUnlockedWithUnlockedType({
                    id: 'test-abc-123',
                })

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                expect(
                    await screen.findByRole('link', {
                        name: /Go to dashboard/,
                    })
                ).toBeInTheDocument()
            })

            it('renders the sidenav for CMS users', async () => {
                const contract =
                    mockContractPackageSubmittedWithQuestions('test-abc-123')

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                expect(
                    await screen.findByTestId('submission-side-nav')
                ).toBeInTheDocument()
            })

            it('renders incomplete submission UI on submitted submission', async () => {
                const contract = mockContractPackageSubmitted({
                    id: 'test-abc-123',
                })
                contract.packageSubmissions[0].rateRevisions = []

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('error-alert')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('Incomplete Submission')
                    ).toBeInTheDocument()

                    expect(
                        screen.getAllByText(
                            'You must unlock the submission so the state can add a rate certification.'
                        )
                    ).toHaveLength(2)
                })
            })

            describe('Submission package data display', () => {
                it('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
                    const contract =
                        mockContractPackageUnlockedWithUnlockedType({
                            id: 'test-abc-123',
                        })
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    contract.draftRevision!.formData.submissionDescription =
                        'NEW_DESCRIPTION'
                    contract.packageSubmissions[0].contractRevision.formData.submissionDescription =
                        'OLD_DESCRIPTION'

                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {},
                        }
                    )

                    expect(
                        await screen.findByText('OLD_DESCRIPTION')
                    ).toBeInTheDocument()
                    expect(
                        screen.queryByText('NEW_DESCRIPTION')
                    ).not.toBeInTheDocument()
                })
            })

            describe('CMS user unlock submission', () => {
                it('renders the unlock button', async () => {
                    const contract = mockContractPackageSubmittedWithQuestions({
                        id: 'test-abc-123',
                    })

                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {},
                        }
                    )

                    expect(
                        await screen.findByRole('button', {
                            name: 'Unlock submission',
                        })
                    ).toBeInTheDocument()
                })

                it('renders the submission date correctly taking into account pacific time', async () => {
                    // an early morning ET submission date that will listed as initially submitted the day before
                    // 02/03/2025 2:01am ET
                    const earlyMorningET = dayjs()
                        .tz('America/New_York')
                        .year(2025)
                        .month(1)
                        .date(3)
                        .hour(2)
                        .minute(1)
                    const ptDateFormatted = '02/02/2025'

                    const contract =
                        mockContractPackageUnlockedWithUnlockedType({
                            id: 'test-abc-123',
                            initiallySubmittedAt: earlyMorningET.toDate(),
                        })

                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                        }
                    )

                    expect(
                        await screen.findByLabelText('Submitted')
                    ).toHaveTextContent(ptDateFormatted)
                })

                it('extracts the correct document dates from the submission and displays them in tables', async () => {
                    const contract = mockContractPackageSubmitted({
                        id: 'test-abc-123',
                    })
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {},
                        }
                    )
                    await waitFor(() => {
                        const rows = screen.getAllByRole('row')
                        expect(rows).toHaveLength(10)
                        expect(
                            within(rows[0]).getByText('Date added')
                        ).toBeInTheDocument()
                        // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
                        expect(
                            within(rows[1]).getByText('12/31/2023')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[2]).getByText('Date added')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[3]).getByText('01/14/2024')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[4]).getByText('01/12/2024')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[5]).getByText('Date added')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[6]).getByText('12/31/2022')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[7]).getByText('Date added')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[8]).getByText('01/14/2023')
                        ).toBeInTheDocument()
                        expect(
                            within(rows[9]).getByText('01/14/2023')
                        ).toBeInTheDocument()
                    })
                })

                it('disables the unlock button for an unlocked submission', async () => {
                    const contract =
                        mockContractPackageUnlockedWithUnlockedType({
                            id: 'test-abc-123',
                        })

                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {},
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.queryByRole('button', {
                                name: 'Unlock submission',
                            })
                        ).not.toBeInTheDocument()

                        expect(
                            screen.getByText(
                                "No action can be taken on this submission in it's current status."
                            )
                        ).toBeInTheDocument()
                    })
                })

                it('displays unlock banner with correct data for an unlocked submission', async () => {
                    renderWithProviders(
                        <Routes>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract:
                                            mockContractPackageUnlockedWithUnlockedType(
                                                {
                                                    id: '15',
                                                }
                                            ),
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/15',
                            },
                        }
                    )

                    expect(
                        await screen.findByTestId('unlockedBanner')
                    ).toBeInTheDocument()
                    expect(
                        await screen.findByTestId('unlockedBanner')
                    ).toHaveClass('usa-alert--warning')
                    expect(
                        await screen.findByTestId('unlockedBanner')
                    ).toHaveTextContent(
                        /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ PT/i
                    )
                    expect(
                        await screen.findByTestId('unlockedBanner')
                    ).toHaveTextContent('Unlocked by: cms@example.com')
                    expect(
                        await screen.findByTestId('unlockedBanner')
                    ).toHaveTextContent(
                        'Reason for unlock: unlocked for a test'
                    )
                })

                it('does not render incomplete submission UI on unlocked submission', async () => {
                    const contract =
                        mockContractPackageUnlockedWithUnlockedType({
                            id: 'test-abc-123',
                        })
                    contract.packageSubmissions[0].rateRevisions = []

                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {},
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.getByTestId('unlockedBanner')
                        ).toBeInTheDocument()
                        expect(
                            screen.getByTestId('unlockedBanner')
                        ).toHaveClass('usa-alert--warning')
                        expect(
                            screen.getByTestId('unlockedBanner')
                        ).toHaveTextContent(
                            /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ PT/i
                        )
                        expect(
                            screen.getByTestId('unlockedBanner')
                        ).toHaveTextContent('by: cms@example.com')
                        expect(
                            screen.getByTestId('unlockedBanner')
                        ).toHaveTextContent(
                            'Reason for unlock: unlocked for a test'
                        )
                    })

                    expect(
                        screen.queryByRole('error-alert')
                    ).not.toBeInTheDocument()
                    expect(
                        screen.queryByRole('Incomplete Submission')
                    ).not.toBeInTheDocument()

                    expect(
                        screen.queryAllByText(
                            'You must unlock the submission so the state can add a rate certification.'
                        )
                    ).toHaveLength(0)
                })
            })

            describe('submission approval tests', () => {
                it('renders released to state button', async () => {
                    const contract =
                        mockContractPackageSubmittedWithQuestions(
                            'test-abc-123'
                        )
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {
                                'submission-approvals': true,
                            },
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.getByTestId('submission-side-nav')
                        ).toBeInTheDocument()
                        expect(
                            screen.getByText('MCR-MN-0005-SNBC')
                        ).toBeInTheDocument()
                    })

                    // expect submission released to state button to be on the screen
                    expect(
                        screen.queryByRole('link', {
                            name: 'Released to state',
                        })
                    ).toBeInTheDocument()

                    // expect unlock button
                    expect(
                        screen.getByRole('button', {
                            name: 'Unlock submission',
                        })
                    ).toHaveClass('usa-button')
                })
                it('does not render released to state link on unlocked submission', async () => {
                    const unlockedContract =
                        mockContractPackageUnlockedWithUnlockedType({
                            id: 'test-abc-123',
                        })
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockValidCMSUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract: unlockedContract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract: unlockedContract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {
                                'submission-approvals': true,
                            },
                        }
                    )
                    await waitFor(() => {
                        expect(
                            screen.getByTestId('submission-side-nav')
                        ).toBeInTheDocument()
                        expect(
                            screen.getByText('MCR-MN-0005-SNBC')
                        ).toBeInTheDocument()
                    })

                    // expect released to state link to not exist
                    expect(
                        screen.queryByRole('link', {
                            name: 'Released to state',
                        })
                    ).not.toBeInTheDocument()

                    // expect unlock button to be not on the page
                    expect(
                        screen.queryByRole('button', {
                            name: 'Unlock submission',
                        })
                    ).not.toBeInTheDocument()

                    expect(
                        screen.getByText(
                            "No action can be taken on this submission in it's current status."
                        )
                    ).toBeInTheDocument()
                })

                it('does not render released to state button for an approved submission', async () => {
                    const contract =
                        mockContractPackageSubmittedWithQuestions(
                            'test-abc-123'
                        )
                    contract.reviewStatus = 'APPROVED'
                    contract.consolidatedStatus = 'APPROVED'
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockValidCMSUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract: contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract: contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {
                                'submission-approvals': true,
                            },
                        }
                    )
                    await waitFor(() => {
                        expect(
                            screen.getByTestId('submission-side-nav')
                        ).toBeInTheDocument()
                    })

                    // expect submission released to state link to not exist
                    expect(
                        screen.queryByRole('link', {
                            name: 'Released to state',
                        })
                    ).toBeNull()

                    // expect unlock button to be not on the page
                    expect(
                        screen.queryByRole('button', {
                            name: 'Unlock submission',
                        })
                    ).not.toBeInTheDocument()

                    expect(
                        screen.getByText(
                            "No action can be taken on this submission in it's current status."
                        )
                    ).toBeInTheDocument()
                })

                it('renders approval banner on approved submission', async () => {
                    const contract = mockContractPackageSubmittedWithQuestions(
                        'test-abc-123',
                        {
                            status: 'RESUBMITTED',
                            reviewStatus: 'APPROVED',
                            consolidatedStatus: 'APPROVED',
                            reviewStatusActions: [
                                {
                                    actionType: 'MARK_AS_APPROVED',
                                    contractID: 'test-abc-123',
                                    updatedAt: new Date(),
                                    updatedBy: {
                                        email: 'cmsapprover@example.com',
                                        familyName: 'Smith',
                                        givenName: 'John',
                                        role: 'CMS_APPROVER_USER',
                                    },
                                    updatedReason: 'Some approval reason',
                                },
                            ],
                        }
                    )
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockValidCMSUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {
                                'submission-approvals': true,
                            },
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.getByTestId('submission-side-nav')
                        ).toBeInTheDocument()
                        expect(
                            screen.getByText('MCR-MN-0005-SNBC')
                        ).toBeInTheDocument()
                        // expect submission approval banner to be on screen
                        expect(
                            screen.getByTestId('submissionApprovedBanner')
                        ).toBeInTheDocument()
                    })
                })

                it('does not render the unlock submission button for an approved contract', async () => {
                    const contract = mockContractPackageApproved()
                    renderWithProviders(
                        <Routes>
                            <Route element={<SubmissionSideNav />}>
                                <Route
                                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                    element={<SubmissionSummary />}
                                />
                            </Route>
                        </Routes>,
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockValidCMSUser(),
                                        statusCode: 200,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                    fetchContractWithQuestionsMockSuccess({
                                        contract,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: '/submissions/test-abc-123',
                            },
                            featureFlags: {
                                'submission-approvals': true,
                            },
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.getByTestId('submission-side-nav')
                        ).toBeInTheDocument()
                        expect(
                            screen.getByText('MCR-MN-0005-SNBC')
                        ).toBeInTheDocument()
                    })

                    const unlockBtn = screen.queryByRole('button', {
                        name: 'Unlock submission',
                    })
                    expect(unlockBtn).not.toBeInTheDocument()

                    expect(
                        screen.getByText(
                            "No action can be taken on this submission in it's current status."
                        )
                    ).toBeInTheDocument()
                })
            })
        }
    )

    describe('STATE_USER SubmissionSummary tests', () => {
        it('renders without errors', async () => {
            const contract =
                mockContractPackageSubmittedWithQuestions('test-abc-123')

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )
            expect(
                await screen.findByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
        })

        it('renders submission updated banner', async () => {
            const contract = mockContractPackageSubmitted({
                status: 'RESUBMITTED',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )

            expect(
                await screen.findByTestId('updatedSubmissionBanner')
            ).toBeInTheDocument()
            expect(
                await screen.findByTestId('updatedSubmissionBanner')
            ).toHaveClass('usa-alert--info')
            expect(
                await screen.findByTestId('updatedSubmissionBanner')
            ).toHaveTextContent(
                /Updated on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ PT/i
            )
            expect(
                await screen.findByTestId('updatedSubmissionBanner')
            ).toHaveTextContent('Submitted by: example@state.com')
            expect(
                await screen.findByTestId('updatedSubmissionBanner')
            ).toHaveTextContent('Changes made: contract submit')
        })

        it('does not render an add mccrs-id link for state user', async () => {
            const contract =
                mockContractPackageSubmittedWithQuestions('test-abc-123')

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )
            await waitFor(() => {
                expect(
                    screen.queryByText('Add MC-CRS record number')
                ).not.toBeInTheDocument()
            })
        })

        it('redirects to review and submit page for State user', async () => {
            let testLocation: Location
            const contract = mockContractPackageUnlockedWithUnlockedType({
                id: 'test-abc-123',
            })

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                    location: (location) => (testLocation = location),
                }
            )
            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    generatePath(RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT, {
                        id: 'test-abc-123',
                    })
                )
            })
        })

        it('renders back to dashboard link for state users', async () => {
            const contract =
                mockContractPackageSubmittedWithQuestions('test-abc-123')

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )
            screen.debug()
            expect(
                await screen.findByRole('heading', {
                    name: 'Contract details',
                })
            ).toBeInTheDocument()
            expect(
                await screen.findByRole('link', {
                    name: /Go to state dashboard/,
                })
            ).toBeInTheDocument()
        })

        it('renders the sidenav for State users', async () => {
            const contract =
                mockContractPackageSubmittedWithQuestions('test-abc-123')

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )

            expect(
                await screen.findByTestId('submission-side-nav')
            ).toBeInTheDocument()
        })

        it('renders incomplete submission UI on submitted submission', async () => {
            const contract = mockContractPackageSubmitted({
                id: 'test-abc-123',
            })
            contract.packageSubmissions[0].rateRevisions = []

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {},
                }
            )

            await waitFor(() => {
                expect(screen.getByTestId('error-alert')).toBeInTheDocument()
                expect(
                    screen.getByText('Incomplete Submission')
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'You must contact your CMS point of contact and request an unlock to complete the submission.'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'You must contact your CMS point of contact and request an unlock.'
                    )
                ).toBeInTheDocument()
            })
        })

        it(`does not render released to state button`, async () => {
            const contract =
                mockContractPackageSubmittedWithQuestions('test-abc-123')
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'submission-approvals': true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-side-nav')
                ).toBeInTheDocument()
                expect(screen.getByText('MCR-MN-0005-SNBC')).toBeInTheDocument()
                expect(
                    screen.getByText('Submission description')
                ).toBeInTheDocument()
            })

            // expect submission released to state button to not exist
            expect(
                screen.queryByRole('link', { name: 'Released to state' })
            ).toBeNull()
        })

        it(`renders approval banner on approved submissions`, async () => {
            const contract = mockContractPackageSubmittedWithQuestions(
                'test-abc-123',
                {
                    status: 'RESUBMITTED',
                    reviewStatus: 'APPROVED',
                    consolidatedStatus: 'APPROVED',
                    reviewStatusActions: [
                        {
                            actionType: 'MARK_AS_APPROVED',
                            contractID: 'test-abc-123',
                            updatedAt: new Date(),
                            updatedBy: {
                                email: 'cmsapprover@example.com',
                                familyName: 'Smith',
                                givenName: 'John',
                                role: 'CMS_APPROVER_USER',
                            },
                            updatedReason: 'Some approval reason',
                        },
                    ],
                }
            )

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummary />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'submission-approvals': true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByTestId('submission-side-nav')
                ).toBeInTheDocument()
                expect(screen.getByText('MCR-MN-0005-SNBC')).toBeInTheDocument()
            })

            // expect submission approval banner to be on screen
            expect(
                screen.getByTestId('submissionApprovedBanner')
            ).toBeInTheDocument()

            // expect submission updated banner to not be on screen.
            expect(screen.queryByTestId('updatedSubmissionBanner')).toBeNull()
        })
    })

    describe.each(iterableAdminUsersMockData)(
        '$userRole submission tests',
        ({ mockUser }) => {
            it(`does not render released to state button`, async () => {
                const contract =
                    mockContractPackageSubmittedWithQuestions('test-abc-123')
                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {
                            'submission-approvals': true,
                        },
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('submission-side-nav')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('MCR-MN-0005-SNBC')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('Submission description')
                    ).toBeInTheDocument()
                })

                // expect submission released to state button to not exist
                expect(
                    screen.queryByRole('link', { name: 'Released to state' })
                ).toBeNull()
            })

            it(`renders approval banner on approved submissions`, async () => {
                const contract = mockContractPackageSubmittedWithQuestions(
                    'test-abc-123',
                    {
                        status: 'RESUBMITTED',
                        reviewStatus: 'APPROVED',
                        consolidatedStatus: 'APPROVED',
                        reviewStatusActions: [
                            {
                                actionType: 'MARK_AS_APPROVED',
                                contractID: 'test-abc-123',
                                updatedAt: new Date(),
                                updatedBy: {
                                    email: 'cmsapprover@example.com',
                                    familyName: 'Smith',
                                    givenName: 'John',
                                    role: 'CMS_APPROVER_USER',
                                },
                                updatedReason: 'Some approval reason',
                            },
                        ],
                    }
                )

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {
                            'submission-approvals': true,
                        },
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('submission-side-nav')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('MCR-MN-0005-SNBC')
                    ).toBeInTheDocument()
                })

                // expect submission approval banner to be on screen
                expect(
                    screen.getByTestId('submissionApprovedBanner')
                ).toBeInTheDocument()

                // expect submission updated banner to not be on screen.
                expect(
                    screen.queryByTestId('updatedSubmissionBanner')
                ).toBeNull()
            })

            it('renders incomplete submission UI on submitted submission', async () => {
                const contract = mockContractPackageSubmitted({
                    id: 'test-abc-123',
                })
                contract.packageSubmissions[0].rateRevisions = []

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('error-alert')
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText('Incomplete Submission')
                    ).toBeInTheDocument()

                    expect(
                        screen.getAllByText(
                            'CMS must unlock the submission so the state can add a rate certification.'
                        )
                    ).toHaveLength(2)
                })
            })

            it('does not render incomplete submission UI on unlocked submission', async () => {
                const contract = mockContractPackageUnlockedWithUnlockedType({
                    id: 'test-abc-123',
                })
                contract.packageSubmissions[0].rateRevisions = []

                renderWithProviders(
                    <Routes>
                        <Route element={<SubmissionSideNav />}>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_SUMMARY}
                                element={<SubmissionSummary />}
                            />
                        </Route>
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                                fetchContractWithQuestionsMockSuccess({
                                    contract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/test-abc-123',
                        },
                        featureFlags: {},
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('unlockedBanner')
                    ).toBeInTheDocument()
                })

                expect(
                    screen.queryByRole('error-alert')
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByRole('Incomplete Submission')
                ).not.toBeInTheDocument()

                expect(
                    screen.queryAllByText(
                        'CMS must unlock the submission so the state can add a rate certification.'
                    )
                ).toHaveLength(0)
            })
        }
    )
})
