import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '../../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockValidCMSUser,
    mockValidUser,
    mockValidStateUser,
    mockContractPackageSubmitted,
} from '../../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionSummaryV2 } from './SubmissionSummaryV2'
import { SubmissionSideNav } from '../../SubmissionSideNav'
import { testS3Client } from '../../../testHelpers/s3Helpers'
import { mockContractPackageUnlocked } from '../../../testHelpers/apolloMocks/contractPackageDataMock'

describe('SubmissionSummary', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmitted(),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it('renders submission updated banner', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmitted({
                                status: 'RESUBMITTED',
                            }),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
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
            /Updated on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
        )
        expect(
            await screen.findByTestId('updatedSubmissionBanner')
        ).toHaveTextContent('Submitted by: example@state.com')
        expect(
            await screen.findByTestId('updatedSubmissionBanner')
        ).toHaveTextContent('Changes made: contract submit')
    })

    it('renders submission unlocked banner for CMS user', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByTestId('unlockedBanner')).toBeInTheDocument()
            expect(screen.getByTestId('unlockedBanner')).toHaveClass(
                'usa-alert--warning'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'by: example@state.com'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'Reason for unlock: unlocked for a test'
            )
        })
    })

    it('pulls the right version of UNLOCKED data for CMS users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        expect(await screen.findByText('MCR-MN-0005-SNBC')).toBeInTheDocument()

        const description = await screen.findByLabelText(
            'Submission description'
        )
        expect(description).toHaveTextContent('An initial submission')
        const ratingPeriod = await screen.findByLabelText(
            'Rating period of original rate certification'
        )
        expect(ratingPeriod).toHaveTextContent('01/01/2020 to 01/01/2021')
    })

    it('renders add mccrs-id link for CMS user', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmitted({
                                id: 'test-abc-123',
                            }),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByText('Add MC-CRS record number')
            ).toBeInTheDocument()
        })
    })

    it('renders edit mccrs-id link for CMS user when submission has a mccrs id', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmitted({
                                id: 'test-abc-123',
                                mccrsID: '3333',
                            }),
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.queryByText('Add MC-CRS record number')
            ).not.toBeInTheDocument()
            expect(screen.getByText('Edit MC-CRS number')).toBeInTheDocument()
        })
    })

    it('does not render an add mccrs-id link for state user', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.queryByText('Add MC-CRS record number')
            ).not.toBeInTheDocument()
        })
    })

    it('renders submission unlocked banner for State user', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByTestId('unlockedBanner')).toBeInTheDocument()
            expect(screen.getByTestId('unlockedBanner')).toHaveClass(
                'usa-alert--info'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'by: example@state.com'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'Reason for unlock: unlocked for a test'
            )
        })
    })

    it('renders document download warning banner', async () => {
        const s3Provider = {
            ...testS3Client(),
            getBulkDlURL: async (
                _keys: string[],
                _fileName: string
            ): Promise<string | Error> => {
                return new Error('Error: getBulkDlURL encountered an error')
            },
        }
        const contract = mockContractPackageSubmitted()
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
                s3Provider,
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('warning-alert')).toBeInTheDocument()
            expect(screen.getByTestId('warning-alert')).toHaveClass(
                'usa-alert--warning'
            )
            expect(screen.getByTestId('warning-alert')).toHaveTextContent(
                'Document download unavailable'
            )
        })
    })

    it('renders back to dashboard link for state users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmitted(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        screen.debug()
        expect(
            await screen.findByRole('heading', {
                name: 'Contract details',
            })
        ).toBeInTheDocument()
        expect(
            await screen.findByRole('link', { name: /Back to state dashboard/ })
        ).toBeInTheDocument()
    })

    it('renders back to dashboard link for CMS users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        expect(
            await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
        ).toBeInTheDocument()
    })

    it('renders the sidenav for CMS users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        expect(
            await screen.findByTestId('submission-side-nav')
        ).toBeInTheDocument()
    })

    it('renders the sidenav for State users', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummaryV2 />}
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        expect(
            await screen.findByTestId('submission-side-nav')
        ).toBeInTheDocument()
    })

    describe('Submission package data display', () => {
        it('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
            const contract = mockContractPackageUnlocked()
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
                            element={<SubmissionSummaryV2 />}
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: 'test-abc-123',
                                }
                            ),
                            fetchContractMockSuccess({
                                contract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'link-rates': true,
                    },
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
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummaryV2 />}
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: 'test-abc-123',
                                }
                            ),
                            fetchContractMockSuccess({
                                contract: mockContractPackageSubmitted(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'link-rates': true,
                    },
                }
            )

            expect(
                await screen.findByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
        })

        it('extracts the correct dates from the submission and displays them in tables', async () => {
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummaryV2 />}
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: 'test-abc-123',
                                }
                            ),
                            fetchContractMockSuccess({
                                contract: mockContractPackageSubmitted(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'link-rates': true,
                    },
                }
            )
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(10)
                expect(
                    within(rows[0]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[1]).getByText('1/1/24')).toBeInTheDocument()
                expect(
                    within(rows[2]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[3]).getByText('1/15/24')).toBeInTheDocument()
                expect(within(rows[4]).getByText('1/13/24')).toBeInTheDocument()
                expect(
                    within(rows[5]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[6]).getByText('1/1/23')).toBeInTheDocument()
                expect(
                    within(rows[7]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[8]).getByText('1/15/23')).toBeInTheDocument()
                expect(within(rows[9]).getByText('1/15/23')).toBeInTheDocument()
            })
        })

        it('disables the unlock button for an unlocked submission', async () => {
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_SUMMARY}
                            element={<SubmissionSummaryV2 />}
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: 'test-abc-123',
                                }
                            ),
                            fetchContractMockSuccess({
                                contract: mockContractPackageUnlocked(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123',
                    },
                    featureFlags: {
                        'link-rates': true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByRole('button', {
                        name: 'Unlock submission',
                    })
                ).toBeDisabled()
            })
        })
    })
})
