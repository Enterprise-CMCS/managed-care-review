import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageSubmittedWithRevisions,
    iterableCmsUsersMockData,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers'
import { EQROSubmissionRevisionSummary } from './EQROSubmissionRevisionSummary'

describe('EQROSubmissionRevisionSummary', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole EQROSubmissionRevisionSummary tests',
        ({ mockUser }) => {
            it('renders the EQRO revision snapshot without status tag or banners', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<EQROSubmissionRevisionSummary />}
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
                                                contractSubmissionType: 'EQRO',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/eqro/15/revisions/2',
                        },
                        featureFlags: {},
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByTestId('submission-summary')
                    ).toBeInTheDocument()
                })

                // EQRO-style heading (the standard page would say "Submission type")
                expect(
                    await screen.findByRole('heading', {
                        name: 'Submission details',
                        level: 2,
                    })
                ).toBeInTheDocument()

                // Contract details section still shows
                expect(
                    await screen.findByRole('heading', {
                        name: 'Contract details',
                    })
                ).toBeInTheDocument()

                // Previous submission banner is visible
                expect(
                    await screen.findByTestId('previous-submission-banner')
                ).toBeInTheDocument()

                // Version stamp on the selected revision
                expect(
                    await screen.findByTestId('revision-version')
                ).toBeInTheDocument()

                // EQRO summary section should not render rate details
                expect(
                    screen.queryByRole('heading', { name: 'Rate details' })
                ).not.toBeInTheDocument()
            })

            it.each([
                {
                    revisionVersion: '1',
                    submissionDescription: 'Submission 1',
                    contractDocumentName: 'contract1',
                    otherRevisionContractDocumentName: 'contract2',
                },
                {
                    revisionVersion: '2',
                    submissionDescription: 'Submission 2',
                    contractDocumentName: 'contract2',
                    otherRevisionContractDocumentName: 'contract3',
                },
                {
                    revisionVersion: '3',
                    submissionDescription: 'Submission 3',
                    contractDocumentName: 'contract3',
                    otherRevisionContractDocumentName: 'contract2',
                },
            ])(
                'renders the snapshot form data for revision $revisionVersion',
                async ({
                    revisionVersion,
                    submissionDescription,
                    contractDocumentName,
                    otherRevisionContractDocumentName,
                }) => {
                    renderWithProviders(
                        <Routes>
                            <Route
                                path={RoutesRecord.SUBMISSIONS_REVISION}
                                element={<EQROSubmissionRevisionSummary />}
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
                                                    contractSubmissionType:
                                                        'EQRO',
                                                }
                                            ),
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: `/submissions/eqro/15/revisions/${revisionVersion}`,
                            },
                            featureFlags: {},
                        }
                    )

                    expect(
                        await screen.findByLabelText('Submission description')
                    ).toHaveTextContent(submissionDescription)
                    expect(
                        await screen.findByText(contractDocumentName)
                    ).toBeInTheDocument()
                    // Documents table only lists this revision's snapshot docs
                    expect(
                        screen.queryByText(otherRevisionContractDocumentName)
                    ).not.toBeInTheDocument()
                }
            )

            it('returns 404 when the requested revision does not exist', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_REVISION}
                            element={<EQROSubmissionRevisionSummary />}
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
                                                contractSubmissionType: 'EQRO',
                                            }
                                        ),
                                }),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/eqro/15/revisions/99',
                        },
                        featureFlags: {},
                    }
                )

                expect(
                    await screen.findByRole('heading', {
                        name: '404 / Page not found',
                    })
                ).toBeInTheDocument()
            })
        }
    )
})
