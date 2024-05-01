import { screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    fetchContractMockSuccess,
    mockContractPackageSubmittedWithRevisions,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionRevisionSummaryV2 } from './SubmissionRevisionSummaryV2'
import { dayjs } from '../../common-code/dateHelpers'

describe('SubmissionRevisionSummary', () => {
    it('renders correctly without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummaryV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmittedWithRevisions(
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
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
        const submissionVersion = `02/16/24 10:22pm ET version`
        expect(await screen.findByText(submissionVersion)).toBeInTheDocument()
        expect(
            await screen.findByTestId('previous-submission-banner')
        ).toBeInTheDocument()
        screen.debug()
    })

    it('extracts the correct dates from the submission and displays them in tables', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummaryV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmittedWithRevisions(
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
                featureFlags: {
                    'link-rates': true,
                },
            }
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(10)
            expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
            expect(
                within(rows[1]).getByText(
                    dayjs(
                        mockContractPackageSubmittedWithRevisions()
                            .packageSubmissions[1]?.contractRevision?.submitInfo
                            ?.updatedAt
                    ).format('M/D/YY')
                )
            ).toBeInTheDocument()
        })
    })

    it('renders the right indexed version 2', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummaryV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmittedWithRevisions({
                                id: '15'
                            })
                        })
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/2',
                },
                featureFlags: {
                    'link-rates': true,
                },
            } 
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
        
        expect(await screen.findByLabelText('Submission description')).toHaveTextContent('Submission 2')
        expect(await screen.findByText('rate2 doc')).toBeInTheDocument()

    })

    it('renders the right indexed version 1', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummaryV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmittedWithRevisions({
                                id: '15'
                            })
                        })
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/1',
                },
                featureFlags: {
                    'link-rates': true,
                },
            } 
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
        
        expect(await screen.findByLabelText('Submission description')).toHaveTextContent('Submission 1')
    })

    it('renders the error indexed version 3', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummaryV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageSubmittedWithRevisions({
                                id: '15'
                            })
                        })
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/3',
                },
                featureFlags: {
                    'link-rates': true,
                },
            } 
        )
        expect(await screen.findByRole('heading')).toHaveTextContent('404 / Page not found')
        
    })

    // it('extracts the correct dates from the submission and displays them in tables', async () => {
    //     renderWithProviders(
    //         <Routes>
    //             <Route
    //                 path={RoutesRecord.SUBMISSIONS_REVISION}
    //                 element={<SubmissionRevisionSummary />}
    //             />
    //         </Routes>,
    //         {
    //             apolloProvider: {
    //                 mocks: [
    //                     fetchCurrentUserMock({
    //                         user: mockValidCMSUser(),
    //                         statusCode: 200,
    //                     }),
    //                     fetchStateHealthPlanPackageMockSuccess({
    //                         stateSubmission:
    //                             mockSubmittedHealthPlanPackageWithRevisions(),
    //                         id: '15',
    //                     }),
    //                 ],
    //             },
    //             routerProvider: {
    //                 route: '/submissions/15/revisions/2',
    //             },
    //         }
    //     )
    //     await waitFor(() => {
    //         const rows = screen.getAllByRole('row')
    //         expect(rows).toHaveLength(2)
    //         expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
    //         expect(
    //             within(rows[1]).getByText(
    //                 dayjs(
    //                     mockSubmittedHealthPlanPackageWithRevisions()
    //                         .revisions[2]?.node?.submitInfo?.updatedAt
    //                 ).format('M/D/YY')
    //             )
    //         ).toBeInTheDocument()
    //     })
    // })
})
