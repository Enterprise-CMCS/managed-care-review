import fs from 'fs'
import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { basicLockedHealthPlanFormData } from '../../common-code/healthPlanFormDataMocks'
import { domainToBase64 } from '../../common-code/proto/healthPlanFormDataProto'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockUnlockedHealthPlanPackage,
    mockValidCMSUser,
    mockSubmittedHealthPlanPackageWithRevision,
    mockUnlockedHealthPlanPackageWithOldProtos,
    indexHealthPlanPackagesMockSuccess,
    mockValidUser,
    mockStateSubmission,
    mockSubmittedHealthPlanPackage,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionSummary } from './SubmissionSummary'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { testS3Client } from '../../testHelpers/s3Helpers'

describe('SubmissionSummary', () => {
    it('renders without errors', async () => {
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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

    it('renders submission unlocked banner for CMS user', async () => {
        const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
        await waitFor(() => {
            expect(screen.getByTestId('unlockedBanner')).toBeInTheDocument()
            expect(screen.getByTestId('unlockedBanner')).toHaveClass(
                'usa-alert--warning'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'by: bob@dmas.mn.gov'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'Reason for unlock: Test unlock reason'
            )
        })
    })

    it('renders add mccrs-id link for CMS user', async () => {
        const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
        await waitFor(() => {
            expect(
                screen.getByText('Add MC-CRS record number')
            ).toBeInTheDocument()
        })
    })

    it('renders edit mccrs-id link for CMS user when submission has a mccrs id', async () => {
        const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            stateSubmission: {
                                ...submissionsWithRevisions,
                                mccrsID: '3333',
                            },
                            id: '15',
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
                screen.queryByText('Add MC-CRS record number')
            ).not.toBeInTheDocument()
            expect(screen.getByText('Edit MC-CRS number')).toBeInTheDocument()
        })
    })

    it('does not render an add mccrs-id link for state user', async () => {
        const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
        await waitFor(() => {
            expect(
                screen.queryByText('Add MC-CRS record number')
            ).not.toBeInTheDocument()
        })
    })

    it('renders submission unlocked banner for State user', async () => {
        const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
        await waitFor(() => {
            expect(screen.getByTestId('unlockedBanner')).toBeInTheDocument()
            expect(screen.getByTestId('unlockedBanner')).toHaveClass(
                'usa-alert--info'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'by: bob@dmas.mn.gov'
            )
            expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
                'Reason for unlock: Test unlock reason'
            )
        })
    })

    it('renders document download warning banner', async () => {
        const s3Provider = {
            ...testS3Client(),
            getBulkDlURL: async (
                keys: string[],
                fileName: string
            ): Promise<string | Error> => {
                return new Error('Error: getBulkDlURL encountered an error')
            },
        }
        const contractAndRate = mockSubmittedHealthPlanPackage(
            mockStateSubmission()
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                            stateSubmission: contractAndRate,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
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

    it('renders the sidenav for CMS users', async () => {
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '1337',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/1337',
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
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '1337',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/1337',
                },
            }
        )

        expect(
            await screen.findByTestId('submission-side-nav')
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: pkg,
                                }
                            ),
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
    })

    describe('CMS user unlock submission', () => {
        it('renders the unlock button', async () => {
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                }
                            ),
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
                currentSubmitInfo: {
                    updatedAt: new Date('2022-05-12T21:13:20.420Z'),
                },
                previousSubmitInfo: {
                    updatedAt: new Date('2022-04-12T21:13:20.420Z'),
                },
                initialSubmitInfo: {
                    updatedAt: new Date('2022-03-12T21:13:20.420Z'),
                },
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: submission.id,
                                    stateSubmission: submission,
                                }
                            ),
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackage(),
                                }
                            ),
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackage(),
                                }
                            ),
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

        const oldProtoFiles = fs
            .readdirSync(
                'src/common-code/proto/healthPlanFormDataProto/testData/'
            )
            .filter((f) => f.endsWith('.proto'))
        /* as much as we'd like to loop over all the proto files here, looping and async tests,
        which this one is (document loading) produces inconsistent results.  We have to copy/paste
        the test for each proto file. */
        it('loads outdated health plan packages with old protos as expected - 0', async () => {
            const proto = fs.readFileSync(
                `src/common-code/proto/healthPlanFormDataProto/testData/${oldProtoFiles[0]}`
            )
            // pass in the old protos and make sure the UI hasn't changed
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackageWithOldProtos(
                                            proto
                                        ),
                                }
                            ),
                            indexHealthPlanPackagesMockSuccess(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )
            // first check the loading state
            await waitFor(() => {
                expect(document.body).toHaveTextContent(/LOADING/)
            })

            // now check all the page content
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(5)
                expect(
                    screen.getAllByRole('columnheader', {
                        name: /document name/i,
                    })
                ).toHaveLength(2)
                // expect(rows[0]).toHaveTextContent('Date added') removing this assertion - this can no longer be reliably tested from unit tests since protos are not guaranteed to have either sha256 or dateAdded both of which are used in looksup f
                expect(rows[0]).toHaveTextContent('Document name')
                expect(rows[0]).toHaveTextContent('Document category')
                expect(rows[1]).toHaveTextContent('contract doc')
                expect(rows[1]).toHaveTextContent('1/2/21')
                expect(rows[1]).toHaveTextContent('Contract-supporting')
                expect(rows[3]).toHaveTextContent('rates cert 1')
                expect(rows[3]).toHaveTextContent('11/2/21')
                expect(rows[3]).toHaveTextContent('Rate certification')
                expect(rows[4]).toHaveTextContent('rates cert 2')
                expect(document.body).toHaveTextContent(/Submission type/)
                expect(
                    screen.getByRole('heading', {
                        name: 'Submission unlocked',
                    })
                ).toBeInTheDocument()
                /* This is bizarre, but somehow the entire HTML for the page is being reproduced inside the
                "reason for unlocking" text input.  Enough time has been spent on this test.
                I'm ignoring that span, so we're still testing what we need to test */
                expect(
                    screen.getByText('Unlocked by:', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('bob@dmas.mn.gov', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Reason for unlock:', {
                        ignore: 'span',
                    })
                ).toBeInTheDocument()
                expect(screen.getByTestId('clampElement')).toHaveTextContent(
                    'Test unlock reason'
                )
                expect(
                    screen.getByRole('heading', {
                        name: 'MCR-MN-0005-MSC+-PMAP-SNBC',
                    })
                ).toBeInTheDocument()
                expect(screen.getByText('SNBC, PMAP, MSC+')).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract action and rate certification')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission description',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('A real submission')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract action type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract amendment')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract status',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Unexecuted by some or all parties')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract amendment effective dates',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('05/22/2021 to 05/21/2022')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Active federal operating authority',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1915(a) Voluntary Authority')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1937 Benchmark Authority')
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action includes new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Risk-sharing strategy/)
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'State directed payments in accordance with 42 CFR § 438.6(c)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medical loss ratio standards in accordance with 42 CFR § 438.8'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Network adequacy standards')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Non-risk payment arrangements/)
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action does NOT include new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Benefits provided by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Other financial, payment, incentive or related contractual provisions'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Enrollment/disenrollment process')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Grievance and appeal system')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Length of the contract period')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract supporting documents')
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    /MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523/
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Programs this rate certification covers',
                })
            ).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate certification type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/Amendment to prior rate certification/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Certification of capitation rates specific to each rate cell'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rating period of original rate certification',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/05\/22\/2021 to 04\/29\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Date certified for rate amendment',
                })
            ).toBeInTheDocument()
            expect(screen.getByText(/05\/23\/2021/)).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate amendment effective dates',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/06\/21\/2022 to 10\/21\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
            expect(screen.getByText('Contact 2')).toBeInTheDocument()
            const soAndSo = screen.getAllByRole('link', {
                name: 'soandso@example.com',
            })
            expect(soAndSo).toHaveLength(2)
            expect(soAndSo[0]).toHaveAttribute(
                'href',
                'mailto:soandso@example.com'
            )
            const lodar = screen.getAllByRole('link', {
                name: 'lodar@example.com',
            })
            expect(lodar).toHaveLength(2)
            expect(lodar[0]).toHaveAttribute('href', 'mailto:lodar@example.com')

            expect(
                screen.getAllByRole('link', { name: 'lodar@example.com' })
            ).toHaveLength(2)

            expect(screen.getAllByText('Certifying actuary')).toHaveLength(2)
            expect(
                screen.getByText(
                    'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
                )
            ).toBeInTheDocument()
            screen.getByRole('heading', {
                name: 'Change history',
            })
            screen.getByRole('button', {
                name: /09\/01\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /07\/14\/20 8:00pm et - submission/i,
            })
            screen.getByRole('button', {
                name: /07\/31\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /01\/01\/21 7:00pm et - submission/i,
            })
            screen.getByRole('heading', {
                name: 'Reason for unlocking submission',
            })
        })

        it('loads outdated health plan packages with old protos as expected - 1', async () => {
            const proto = fs.readFileSync(
                `src/common-code/proto/healthPlanFormDataProto/testData/${oldProtoFiles[1]}`
            )
            // pass in the old protos and make sure the UI hasn't changed
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackageWithOldProtos(
                                            proto
                                        ),
                                }
                            ),
                            indexHealthPlanPackagesMockSuccess(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )
            // first check the loading state
            await waitFor(() => {
                expect(document.body).toHaveTextContent(/LOADING/)
            })
            // now check all the page content
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(
                    screen.getAllByRole('columnheader', {
                        name: /document name/i,
                    })
                ).toHaveLength(3)
                expect(rows).toHaveLength(7)
                expect(rows[0]).toHaveTextContent('Date added')
                expect(rows[0]).toHaveTextContent('Document name')
                expect(rows[0]).toHaveTextContent('Document category')
                expect(rows[1]).toHaveTextContent('contract doc')
                expect(rows[1]).toHaveTextContent('1/2/21')
                expect(rows[1]).toHaveTextContent('Contract')
                expect(rows[3]).toHaveTextContent('contract doc')
                expect(rows[3]).toHaveTextContent('1/2/21')
                expect(rows[3]).toHaveTextContent('Contract-supporting')
                expect(rows[4]).toHaveTextContent('Document')
                expect(document.body).toHaveTextContent(/Submission type/)
                expect(
                    screen.getByRole('heading', {
                        name: 'Submission unlocked',
                    })
                ).toBeInTheDocument()
                /* This is bizarre, but somehow the entire HTML for the page is being reproduced inside the
                "reason for unlocking" text input.  Enough time has been spent on this test.
                I'm ignoring that span, so we're still testing what we need to test */
                expect(
                    screen.getByText('Unlocked by:', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('bob@dmas.mn.gov', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Reason for unlock:', {
                        ignore: 'span',
                    })
                ).toBeInTheDocument()
                expect(screen.getByTestId('clampElement')).toHaveTextContent(
                    'Test unlock reason'
                )
                expect(
                    screen.getByRole('heading', {
                        name: 'MCR-MN-0005-MSC+-PMAP-SNBC',
                    })
                ).toBeInTheDocument()
                expect(screen.getByText('SNBC, PMAP, MSC+')).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract action and rate certification')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission description',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('A real submission')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract action type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract amendment')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract status',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Unexecuted by some or all parties')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract amendment effective dates',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('05/22/2021 to 05/21/2022')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Active federal operating authority',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1915(a) Voluntary Authority')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1937 Benchmark Authority')
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action includes new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Risk-sharing strategy/)
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'State directed payments in accordance with 42 CFR § 438.6(c)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medical loss ratio standards in accordance with 42 CFR § 438.8'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Network adequacy standards')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Non-risk payment arrangements/)
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action does NOT include new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Benefits provided by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Other financial, payment, incentive or related contractual provisions'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Enrollment/disenrollment process')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Grievance and appeal system')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Length of the contract period')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract supporting documents')
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    /MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523/
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Programs this rate certification covers',
                })
            ).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate certification type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/Amendment to prior rate certification/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Certification of capitation rates specific to each rate cell'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rating period of original rate certification',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/05\/22\/2021 to 04\/29\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Date certified for rate amendment',
                })
            ).toBeInTheDocument()
            expect(screen.getByText(/05\/23\/2021/)).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate amendment effective dates',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/06\/21\/2022 to 10\/21\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
            expect(screen.getByText('Contact 2')).toBeInTheDocument()
            const soAndSo = screen.getAllByRole('link', {
                name: 'soandso@example.com',
            })
            expect(soAndSo).toHaveLength(2)
            expect(soAndSo[0]).toHaveAttribute(
                'href',
                'mailto:soandso@example.com'
            )
            const lodar = screen.getAllByRole('link', {
                name: 'lodar@example.com',
            })
            expect(lodar).toHaveLength(2)
            expect(lodar[0]).toHaveAttribute('href', 'mailto:lodar@example.com')

            expect(
                screen.getAllByRole('link', { name: 'lodar@example.com' })
            ).toHaveLength(2)

            expect(screen.getAllByText('Certifying actuary')).toHaveLength(2)
            expect(
                screen.getByText(
                    'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
                )
            ).toBeInTheDocument()
            screen.getByRole('heading', {
                name: 'Change history',
            })
            screen.getByRole('button', {
                name: /09\/01\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /07\/14\/20 8:00pm et - submission/i,
            })
            screen.getByRole('button', {
                name: /07\/31\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /01\/01\/21 7:00pm et - submission/i,
            })
            screen.getByRole('heading', {
                name: 'Reason for unlocking submission',
            })
        })

        it('loads outdated health plan packages with old protos as expected - 2', async () => {
            const proto = fs.readFileSync(
                `src/common-code/proto/healthPlanFormDataProto/testData/${oldProtoFiles[2]}`
            )
            // pass in the old protos and make sure the UI hasn't changed
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackageWithOldProtos(
                                            proto
                                        ),
                                }
                            ),
                            indexHealthPlanPackagesMockSuccess(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )
            // first check the loading state
            await waitFor(() => {
                expect(document.body).toHaveTextContent(/LOADING/)
            })
            // now check all the page content
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(7)
                expect(rows[0]).toHaveTextContent('Date added')
                expect(rows[0]).toHaveTextContent('Document name')
                expect(rows[0]).toHaveTextContent('Document category')
                expect(rows[1]).toHaveTextContent('contract doc')
                expect(rows[1]).toHaveTextContent('1/2/21')
                expect(rows[1]).toHaveTextContent('Contract')
                expect(rows[2]).toHaveTextContent('Document')
                expect(rows[3]).toHaveTextContent('contract doc')
                expect(rows[3]).toHaveTextContent('1/2/21')
                expect(rows[3]).toHaveTextContent('Contract-supporting')
                expect(rows[4]).toHaveTextContent('Document')
                expect(rows[5]).toHaveTextContent('rates cert 1')
                expect(rows[5]).toHaveTextContent('1/2/21')
                expect(rows[5]).toHaveTextContent('Rate certification')
                expect(rows[6]).toHaveTextContent('1/2/21')
                expect(document.body).toHaveTextContent(/Submission type/)
                expect(
                    screen.getByRole('heading', {
                        name: 'Submission unlocked',
                    })
                ).toBeInTheDocument()
                /* This is bizarre, but somehow the entire HTML for the page is being reproduced inside the
                "reason for unlocking" text input.  Enough time has been spent on this test.
                I'm ignoring that span, so we're still testing what we need to test */
                expect(
                    screen.getByText('Unlocked by:', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('bob@dmas.mn.gov', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Reason for unlock:', {
                        ignore: 'span',
                    })
                ).toBeInTheDocument()
                expect(screen.getByTestId('clampElement')).toHaveTextContent(
                    'Test unlock reason'
                )
                expect(
                    screen.getByRole('heading', {
                        name: 'MCR-MN-0005-MSC+-PMAP-SNBC',
                    })
                ).toBeInTheDocument()
                expect(screen.getByText('SNBC, PMAP, MSC+')).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract action and rate certification')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission description',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('A real submission')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract action type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract amendment')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract status',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Unexecuted by some or all parties')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract amendment effective dates',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('05/22/2021 to 05/21/2022')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Active federal operating authority',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1915(a) Voluntary Authority')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1937 Benchmark Authority')
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action includes new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Risk-sharing strategy/)
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'State directed payments in accordance with 42 CFR § 438.6(c)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medical loss ratio standards in accordance with 42 CFR § 438.8'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Network adequacy standards')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Non-risk payment arrangements/)
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action does NOT include new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Benefits provided by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Other financial, payment, incentive or related contractual provisions'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Enrollment/disenrollment process')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Grievance and appeal system')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Length of the contract period/)
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract supporting documents')
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    /MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523/
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Programs this rate certification covers',
                })
            ).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate certification type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/Amendment to prior rate certification/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Certification of capitation rates specific to each rate cell'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rating period of original rate certification',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/05\/22\/2021 to 04\/29\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Date certified for rate amendment',
                })
            ).toBeInTheDocument()
            expect(screen.getByText(/05\/23\/2021/)).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate amendment effective dates',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/06\/21\/2022 to 10\/21\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
            expect(screen.getByText('Contact 2')).toBeInTheDocument()
            const soAndSo = screen.getAllByRole('link', {
                name: 'soandso@example.com',
            })
            expect(soAndSo).toHaveLength(2)
            expect(soAndSo[0]).toHaveAttribute(
                'href',
                'mailto:soandso@example.com'
            )
            const lodar = screen.getAllByRole('link', {
                name: 'lodar@example.com',
            })
            expect(lodar).toHaveLength(2)
            expect(lodar[0]).toHaveAttribute('href', 'mailto:lodar@example.com')

            expect(
                screen.getAllByRole('link', { name: 'lodar@example.com' })
            ).toHaveLength(2)

            expect(screen.getAllByText('Certifying actuary')).toHaveLength(2)
            expect(
                screen.getByText(
                    'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
                )
            ).toBeInTheDocument()
            screen.getByRole('heading', {
                name: 'Change history',
            })
            screen.getByRole('button', {
                name: /09\/01\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /07\/14\/20 8:00pm et - submission/i,
            })
            screen.getByRole('button', {
                name: /07\/31\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /01\/01\/21 7:00pm et - submission/i,
            })
            screen.getByRole('heading', {
                name: 'Reason for unlocking submission',
            })
        })
        it('loads outdated health plan packages with old protos as expected - 3', async () => {
            const proto = fs.readFileSync(
                `src/common-code/proto/healthPlanFormDataProto/testData/${oldProtoFiles[3]}`
            )
            // pass in the old protos and make sure the UI hasn't changed
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission:
                                        mockUnlockedHealthPlanPackageWithOldProtos(
                                            proto
                                        ),
                                }
                            ),
                            indexHealthPlanPackagesMockSuccess(),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )
            // first check the loading state
            await waitFor(() => {
                expect(document.body).toHaveTextContent(/LOADING/)
            })
            // now check all the page content
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(7)
                expect(rows[0]).toHaveTextContent('Date added')
                expect(rows[0]).toHaveTextContent('Document name')
                expect(rows[0]).toHaveTextContent('Document category')
                expect(rows[1]).toHaveTextContent('contract doc')
                expect(rows[1]).toHaveTextContent('1/2/21')
                expect(rows[1]).toHaveTextContent('Contract')
                expect(rows[2]).toHaveTextContent('Document')
                expect(rows[3]).toHaveTextContent('contract doc')
                expect(rows[3]).toHaveTextContent('1/2/21')
                expect(rows[3]).toHaveTextContent('Contract-supporting')
                expect(rows[4]).toHaveTextContent('Document')
                expect(rows[5]).toHaveTextContent('rates cert 1')
                expect(rows[5]).toHaveTextContent('1/2/21')
                expect(rows[5]).toHaveTextContent('Rate certification')
                expect(rows[6]).toHaveTextContent('1/2/21')
                expect(document.body).toHaveTextContent(/Submission type/)
                expect(
                    screen.getByRole('heading', {
                        name: 'Submission unlocked',
                    })
                ).toBeInTheDocument()
                /* This is bizarre, but somehow the entire HTML for the page is being reproduced inside the
                "reason for unlocking" text input.  Enough time has been spent on this test.
                I'm ignoring that span, so we're still testing what we need to test */
                expect(
                    screen.getByText('Unlocked by:', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('bob@dmas.mn.gov', { ignore: 'span' })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Reason for unlock:', {
                        ignore: 'span',
                    })
                ).toBeInTheDocument()
                expect(screen.getByTestId('clampElement')).toHaveTextContent(
                    'Test unlock reason'
                )
                expect(
                    screen.getByRole('heading', {
                        name: 'MCR-MN-0005-MSC+-PMAP-SNBC',
                    })
                ).toBeInTheDocument()
                expect(screen.getByText('SNBC, PMAP, MSC+')).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract action and rate certification')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Submission description',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('A real submission')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract action type',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract amendment')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract status',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Unexecuted by some or all parties')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Contract amendment effective dates',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('05/22/2021 to 05/21/2022')
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Managed care entities',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Prepaid Inpatient Health Plan (PIHP)')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Primary Care Case Management Entity (PCCM Entity)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'Active federal operating authority',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1915(a) Voluntary Authority')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('1937 Benchmark Authority')
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action includes new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Risk-sharing strategy/)
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'State directed payments in accordance with 42 CFR § 438.6(c)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Medical loss ratio standards in accordance with 42 CFR § 438.8'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Network adequacy standards')
                ).toBeInTheDocument()
                expect(
                    screen.getByText(/Non-risk payment arrangements/)
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('definition', {
                        name: 'This contract action does NOT include new or modified provisions related to the following',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Benefits provided by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText(
                        'Other financial, payment, incentive or related contractual provisions'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Enrollment/disenrollment process')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Grievance and appeal system')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Length of the contract period')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('Contract supporting documents')
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    /MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523/
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Programs this rate certification covers',
                })
            ).toBeInTheDocument()
            expect(screen.getByText('SNBC')).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate certification type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/Amendment to prior rate certification/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Certification of capitation rates specific to each rate cell'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rating period of original rate certification',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/05\/22\/2021 to 04\/29\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Date certified for rate amendment',
                })
            ).toBeInTheDocument()
            expect(screen.getByText(/05\/23\/2021/)).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Rate amendment effective dates',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText(/06\/21\/2022 to 10\/21\/2022/)
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
            expect(screen.getByText('Contact 2')).toBeInTheDocument()
            const soAndSo = screen.getAllByRole('link', {
                name: 'soandso@example.com',
            })
            expect(soAndSo).toHaveLength(2)
            expect(soAndSo[0]).toHaveAttribute(
                'href',
                'mailto:soandso@example.com'
            )
            const lodar = screen.getAllByRole('link', {
                name: 'lodar@example.com',
            })
            expect(lodar).toHaveLength(2)
            expect(lodar[0]).toHaveAttribute('href', 'mailto:lodar@example.com')

            expect(
                screen.getAllByRole('link', { name: 'lodar@example.com' })
            ).toHaveLength(2)

            expect(screen.getAllByText('Certifying actuary')).toHaveLength(2)
            expect(
                screen.getByText(
                    'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
                )
            ).toBeInTheDocument()
            screen.getByRole('heading', {
                name: 'Change history',
            })
            screen.getByRole('button', {
                name: /09\/01\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /07\/14\/20 8:00pm et - submission/i,
            })
            screen.getByRole('button', {
                name: /07\/31\/20 8:00pm et - unlock/i,
            })
            screen.getByRole('button', {
                name: /01\/01\/21 7:00pm et - submission/i,
            })
            screen.getByRole('heading', {
                name: 'Reason for unlocking submission',
            })
        })
    })
})
