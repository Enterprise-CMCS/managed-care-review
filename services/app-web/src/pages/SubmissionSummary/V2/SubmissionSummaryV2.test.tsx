import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { domainToBase64 } from '../../../common-code/proto/healthPlanFormDataProto'
import { RoutesRecord } from '../../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockValidCMSUser,
    mockValidUser,
    mockValidStateUser,
    mockUnlockedHealthPlanPackage,
    mockContractPackageSubmitted,
} from '../../../testHelpers/apolloMocks'
import { basicLockedHealthPlanFormData } from '../../../common-code/healthPlanFormDataMocks'
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
        screen.debug()
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it.skip('renders submission updated banner', async () => {
        // const submissionsWithRevisions =
        //     mockSubmittedHealthPlanPackageWithRevision({})
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

    // it('renders submission unlocked banner for CMS user', async () => {
    //     const submissionsWithRevisions = mockUnlockedHealthPlanPackage()
    //     renderWithProviders(
    //         <Routes>
    //             <Route element={<SubmissionSideNav />}>
    //                 <Route
    //                     path={RoutesRecord.SUBMISSIONS_SUMMARY}
    //                     element={<SubmissionSummary />}
    //                 />
    //             </Route>
    //         </Routes>,
    //         {
    //             apolloProvider: {
    //                 mocks: [
    //                     fetchCurrentUserMock({
    //                         user: mockValidCMSUser(),
    //                         statusCode: 200,
    //                     }),
    //                     fetchStateHealthPlanPackageWithQuestionsMockSuccess({
    //                         stateSubmission: submissionsWithRevisions,
    //                         id: '15',
    //                     }),
    //                 ],
    //             },
    //             routerProvider: {
    //                 route: '/submissions/15',
    //             },
    //         }
    //     )
    //     await waitFor(() => {
    //         expect(screen.getByTestId('unlockedBanner')).toBeInTheDocument()
    //         expect(screen.getByTestId('unlockedBanner')).toHaveClass(
    //             'usa-alert--warning'
    //         )
    //         expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
    //             /on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
    //         )
    //         expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
    //             'by: bob@dmas.mn.gov'
    //         )
    //         expect(screen.getByTestId('unlockedBanner')).toHaveTextContent(
    //             'Reason for unlock: Test unlock reason'
    //         )
    //     })
    // })

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

        const description = await screen.findByLabelText('Submission description')
        expect(description).toHaveTextContent('An initial submission')
        const ratingPeriod = await screen.findByLabelText('Rating period of original rate certification')
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

    it.skip('renders submission unlocked banner for State user', async () => {
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
                            user: mockValidUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: 'test-abc-123',
                        }),
                        fetchContractMockSuccess({
                            contract: {
                                ...contract,
                                status: 'UNLOCKED'
                            }
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
                            contract
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
        it.skip('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
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
                                    stateSubmission: pkg,
                                }
                            ),
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

        it.skip('extracts the correct dates from the submission and displays them in tables', async () => {
            // const submission = mockSubmittedHealthPlanPackageWithRevision({
            //     currentSubmitInfo: {
            //         updatedAt: new Date('2022-05-12T21:13:20.420Z'),
            //     },
            //     previousSubmitInfo: {
            //         updatedAt: new Date('2022-04-12T21:13:20.420Z'),
            //     },
            //     initialSubmitInfo: {
            //         updatedAt: new Date('2022-03-12T21:13:20.420Z'),
            //     },
            // })
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

        it.skip('disables the unlock button for an unlocked submission', async () => {
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

        it.skip('displays unlock banner with correct data for an unlocked submission', async () => {
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
})
