import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageSubmittedWithRevisions,
    iterableCmsUsersMockData,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionRevisionSummary } from './SubmissionRevisionSummaryV2'
import { formatCalendarDate } from '../../common-code/dateHelpers'
import { mockContractPackageWithDifferentProgramsInRevisions } from '../../testHelpers/apolloMocks/contractPackageDataMock'

describe('SubmissionRevisionSummary', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole SubmissionRevisionSummary tests',
        ({ userRole, mockUser }) => {
            it('renders correctly without errors', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/2',
                        },
                        featureFlags: {},
                    }
                )
                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()
                const submissionVersion = `02/16/24 10:22pm ET version`
                expect(
                    await screen.findByText(submissionVersion)
                ).toBeInTheDocument()
                expect(
                    await screen.findByTestId('previous-submission-banner')
                ).toBeInTheDocument()
                screen.debug()
            })

            it('extracts the correct document dates from the submission and displays them in tables', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/2',
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
                    expect(
                        within(rows[1]).getByText(
                            formatCalendarDate(
                                mockContractPackageSubmittedWithRevisions()
                                    .packageSubmissions[1]?.contractRevision
                                    ?.formData.contractDocuments[0].dateAdded,
                                'America/New_York'
                            )
                        )
                    ).toBeInTheDocument()
                })
            })

            it('renders the right indexed version 2', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/2',
                        },
                        featureFlags: {},
                    }
                )
                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()

                expect(
                    await screen.findByLabelText('Submission description')
                ).toHaveTextContent('Submission 2')
                expect(await screen.findByText('rate2 doc')).toBeInTheDocument()
                expect(
                    await screen.findByRole('heading', {
                        name: 'MCR-MN-0005-SNBC',
                    })
                ).toBeInTheDocument()
                // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
                expect(
                    await screen.findByLabelText('Submitted')
                ).toHaveTextContent('12/31/2023')
            })

            it('renders the right indexed version 1', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/1',
                        },
                        featureFlags: {},
                    }
                )
                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()

                expect(
                    await screen.findByLabelText('Submission description')
                ).toHaveTextContent('Submission 1')
            })

            it('renders the right indexed version 3', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/3',
                        },
                        featureFlags: {},
                    }
                )
                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()

                expect(
                    await screen.findByLabelText('Submission description')
                ).toHaveTextContent('Submission 3')
            })

            it('renders the error indexed version 4', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract:
                                        mockContractPackageSubmittedWithRevisions(
                                            {
                                                id: '15',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/revisions/4',
                        },
                        featureFlags: {},
                    }
                )
                expect(await screen.findByRole('heading')).toHaveTextContent(
                    '404 / Page not found'
                )
            })

            it('renders with correct submission name even when previous revisions have different programs', async () => {
                // Test case written during MCR-4120
                const mockContract =
                    mockContractPackageWithDifferentProgramsInRevisions()
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<SubmissionRevisionSummary />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchContractMockSuccess({
                                    contract: mockContract,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: `/submissions/${mockContract.id}/revisions/1`,
                        },
                        featureFlags: {},
                    }
                )

                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()

                // grab information from the earliest submission and check its data displayed
                const [earliestSubmission] =
                    mockContract.packageSubmissions.slice(-1)
                expect(
                    screen.getByRole('heading', {
                        level: 2,
                        name: earliestSubmission.contractRevision.contractName,
                    })
                ).toBeInTheDocument()
                expect(
                    screen.queryByText(
                        earliestSubmission.contractRevision.formData
                            .submissionDescription
                    )
                ).toBeInTheDocument()
            })
        }
    )
})
