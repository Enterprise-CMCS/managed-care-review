import fs from 'fs'
import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { basicLockedHealthPlanFormData } from '../../common-code/healthPlanFormDataMocks'
import { domainToBase64 } from '../../common-code/proto/healthPlanFormDataProto'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageMockSuccess,
    mockUnlockedHealthPlanPackage,
    mockValidCMSUser,
    mockSubmittedHealthPlanPackageWithRevision,
    mockUnlockedHealthPlanPackageWithOldProtos,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionSummary } from './SubmissionSummary'

describe('SubmissionSummary', () => {
    it('renders without errors', async () => {
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
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it('renders submission updated banner', async () => {
        const submissionsWithRevisions =
            mockSubmittedHealthPlanPackageWithRevision({})
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
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            stateSubmission: submissionsWithRevisions,
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
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
        ).toHaveTextContent('Submitted by: aang@example.com')
        expect(
            await screen.findByTestId('updatedSubmissionBanner')
        ).toHaveTextContent('Changes made: Placeholder resubmission reason')
    })

    it('renders back to dashboard link for state users', async () => {
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
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )
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
                <Route
                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                    element={<SubmissionSummary />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(
            await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
        ).toBeInTheDocument()
    })

    describe('Submission package data display', () => {
        it('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
            const pkg = mockUnlockedHealthPlanPackage()

            const oldPackageData = basicLockedHealthPlanFormData()
            const newPackageData = basicLockedHealthPlanFormData()

            oldPackageData.submissionDescription = 'OLD_DESCRIPTION'
            newPackageData.submissionDescription = 'NEW_DESCRIPTION'

            pkg.revisions[0].node.formDataProto = domainToBase64(newPackageData)
            pkg.revisions[1].node.formDataProto = domainToBase64(oldPackageData)

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
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission: pkg,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
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

        it.todo('renders an error when the proto is invalid')
    })

    describe('CMS user unlock submission', () => {
        it('renders the unlock button', async () => {
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
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
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
            const submission = mockSubmittedHealthPlanPackageWithRevision({
                currentSubmissionData: {
                    updatedAt: new Date('2022-05-12T21:13:20.420Z'),
                },
                previousSubmissionData: {
                    updatedAt: new Date('2022-04-12T21:13:20.420Z'),
                },
                initialSubmissionData: {
                    updatedAt: new Date('2022-03-12T21:13:20.420Z'),
                },
            })
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
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: submission.id,
                                stateSubmission: submission,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${submission.id}`,
                    },
                }
            )
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(10)
                expect(
                    within(rows[0]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[1]).getByText('3/12/22')).toBeInTheDocument()
                expect(within(rows[2]).getByText('5/12/22')).toBeInTheDocument()
                expect(
                    within(rows[5]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[7]).getByText('3/12/22')).toBeInTheDocument()
            })
        })

        it('disables the unlock button for an unlocked submission', async () => {
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
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission:
                                    mockUnlockedHealthPlanPackage(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
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
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission:
                                    mockUnlockedHealthPlanPackage(),
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
            expect(await screen.findByTestId('unlockedBanner')).toHaveClass(
                'usa-alert--warning'
            )
            expect(
                await screen.findByTestId('unlockedBanner')
            ).toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            expect(
                await screen.findByTestId('unlockedBanner')
            ).toHaveTextContent('Unlocked by: bob@dmas.mn.govUnlocked')
            expect(
                await screen.findByTestId('unlockedBanner')
            ).toHaveTextContent('Reason for unlock: Test unlock reason')
        })
    })
    describe('Outdated submissions', () => {
        it('Jest timezone should already be UTC', () => {
            expect(new Date().getTimezoneOffset()).toBe(0)
        })

        it('loads outdated health plan packages with old protos as expected', async () => {
            const oldProtoFiles = fs
                .readdirSync(
                    'src/common-code/proto/healthPlanFormDataProto/testData/'
                )
                .filter((f) => f.endsWith('.proto'))

            for (const fileName of oldProtoFiles) {
                const proto = fs.readFileSync(
                    `src/common-code/proto/healthPlanFormDataProto/testData/${fileName}`
                )
                // pass in the old protos and make sure the UI hasn't changed
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
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchStateHealthPlanPackageMockSuccess({
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackageWithOldProtos(
                                            proto
                                        ),
                                }),
                                indexHealthPlanPackagesMockSuccess(),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15',
                        },
                    }
                )

                await waitFor(() => {
                    // there's an async rendering issue with the snapshots unless we run another test first
                    expect(document.body).toHaveTextContent(/Submission type/)
                })
                await waitFor(() => {
                    // there's an async rendering issue with  UploadedDocsTable the snapshots unless we run another test first
                    expect(document.body).not.toHaveTextContent(/LOADING/)
                    expect(document.body).toMatchSnapshot()
                })
            }
        })
    })
})
