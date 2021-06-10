import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import { RoutesRecord } from '../../constants/routes'
import {
    mockDraft,
    fetchCurrentUserMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
} from '../../testHelpers/apolloHelpers'
import {
    SubmissionType,
    ContractType,
    FederalAuthority,
    DraftSubmission,
    Document,
} from '../../gen/gqlClient'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

import { StateSubmissionForm } from './StateSubmissionForm'
import { updatesFromSubmission } from './updateSubmissionTransform'

describe('StateSubmissionForm', () => {
    describe('loads draft submission', () => {
        it('loads submission type fields for /submissions/:id/type', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/type' },
                }
            )

            const description = await screen.findByLabelText(
                'Submission description'
            )
            expect(description).toBeInTheDocument()
            expect(description.textContent).toEqual('A real submission')

            expect(
                await screen.findByLabelText('Contract action only')
            ).toBeChecked()

            const program = await screen.findByLabelText('Program')
            expect(program).toHaveDisplayValue('SNBC')
        })

        it('loads contract details fields for /submissions/:id/contract-details', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '12',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/contract-details',
                    },
                }
            )

            await waitFor(() =>
                expect(
                    screen.getByRole('heading', { name: 'Contract details' })
                ).toBeInTheDocument()
            )
        })

        it('loads documents fields for /submissions/:id/documents', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '12',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/documents',
                    },
                }
            )

            await waitFor(() =>
                expect(
                    screen.getByRole('heading', { name: 'Documents' })
                ).toBeInTheDocument()
            )
        })
    })

    describe('when user edits submission', () => {
        it('change draft submission description and navigate to contract details', async () => {
            const mockSubmission = mockDraft()
            const mockUpdate = updatesFromSubmission(mockSubmission)
            mockUpdate.submissionDescription =
                'A real submission but updated something'

            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                draftSubmission: mockSubmission,
                                id: '15',
                                statusCode: 200,
                            }),
                            updateDraftSubmissionMock({
                                id: '15',
                                updates: mockUpdate,
                                statusCode: 200,
                            }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/type' },
                }
            )

            const heading = await screen.findByRole('heading', {
                name: 'Submission type',
            })
            expect(heading).toBeInTheDocument()

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()

            await screen.findByRole('heading', {
                name: 'Contract details',
            })
        })

        it('works even if other sections of the form have been filled out', async () => {
            const mockDocs: Document[] = [
                {
                    name: 'somedoc.pdf',
                    s3URL: 's3://bucketName/key',
                },
            ]
            const mockDraftSubmissionWithDocs: DraftSubmission = {
                createdAt: new Date(),
                updatedAt: new Date(),
                id: 'test-abc-123',
                stateCode: 'MN',
                programID: 'snbc',
                program: {
                    id: 'snbc',
                    name: 'SNBC',
                },
                name: 'MN-MSHO-0001',
                submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
                submissionDescription: 'A real submission',
                documents: mockDocs,
                contractAmendmentInfo: null,
                contractType: ContractType.Base,
                contractDateStart: new Date(),
                contractDateEnd: new Date(),
                managedCareEntities: [''],
                federalAuthorities: [
                    FederalAuthority.Voluntary,
                    FederalAuthority.Benchmark,
                ],
            }

            const mockUpdate = updatesFromSubmission(
                mockDraftSubmissionWithDocs
            )
            mockUpdate.submissionDescription =
                'A real submission but updated something'

            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                draftSubmission: mockDraftSubmissionWithDocs,
                                statusCode: 200,
                            }),
                            updateDraftSubmissionMock({
                                id: '15',
                                updates: mockUpdate,
                                statusCode: 200,
                            }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/type' },
                }
            )

            const heading = await screen.findByRole('heading', {
                name: 'Submission type',
            })
            expect(heading).toBeInTheDocument()

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()

            await screen.findByRole('heading', {
                name: 'Contract details',
            })
        })
    })

    describe('errors', () => {
        it('shows a generic error fetching submission fails at submission type', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/type' },
                }
            )

            const loading = await screen.findByText('Something went wrong...')
            expect(loading).toBeInTheDocument()
        })
        it('shows a generic error fetching submission fails at contract details', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/contract-details',
                    },
                }
            )

            const loading = await screen.findByText('Something went wrong...')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at documents', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftSubmissionMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/documents' },
                }
            )

            const loading = await screen.findByText('Something went wrong...')
            expect(loading).toBeInTheDocument()
        })
    })
})
