import { screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import { Document } from '../../gen/gqlClient'
import { RoutesRecord } from '../../constants/routes'
import {
    mockDraft,
    fetchCurrentUserMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

import { StateSubmissionForm } from './StateSubmissionForm'
import { updatesFromSubmission } from './updateSubmissionTransform'

describe('StateSubmissionForm', () => {
    describe('loads draft submission', () => {
        it('loads step indicator', async () => {
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
                    routerProvider: {
                        route: '/submissions/15/contract-details',
                    },
                }
            )

            const stepIndicator = await screen.findByTestId('step-indicator')

            expect(stepIndicator).toHaveClass('usa-step-indicator')
        })

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

        it('loads contract details fields for /submissions/:id/contract-details with amendments', async () => {
            const mockAmendment = mockDraft()

            mockAmendment.contractType = 'AMENDMENT'
            mockAmendment.contractAmendmentInfo = {
                itemsBeingAmended: [
                    'CAPITATION_RATES',
                    'GEO_AREA_SERVED',
                    'OTHER',
                ],
                otherItemBeingAmended: 'foobar',
                capitationRatesAmendedInfo: {
                    reason: 'MIDYEAR',
                    otherReason: null,
                },
                relatedToCovid19: true,
                relatedToVaccination: false,
            }

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
                                draftSubmission: mockAmendment,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/contract-details',
                    },
                }
            )

            await waitFor(() => {
                expect(screen.getByLabelText('Capitation rates')).toBeChecked()

                expect(screen.getByLabelText('Mid-year update')).toBeChecked()

                expect(
                    screen.getByLabelText('Geographic area served')
                ).toBeChecked()

                expect(
                    screen.getByLabelText('Other item description')
                ).toHaveValue('foobar')

                // narrow our search for the "Yes" label inside the covid question
                const covid19Question = screen.getByText(
                    'Is this contract action related to the COVID-19 public health emergency?'
                ).parentElement

                if (covid19Question === null) {
                    throw new Error('this element should always have a parent')
                }

                expect(
                    within(covid19Question).getByLabelText('Yes')
                ).toBeChecked()

                // narrow our search for the "Yes" label inside the vax question
                const vaxQuestion = screen.getByText(
                    'Is this related to coverage and reimbursement for vaccine administration?'
                ).parentElement

                if (vaxQuestion === null) {
                    throw new Error('this element should always have a parent')
                }

                expect(within(vaxQuestion).getByLabelText('No')).toBeChecked()
            })
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

            await waitFor(() => {
                expect(screen.getByText('Upload documents')).toBeInTheDocument()
                expect(screen.getByTestId('file-input')).toBeInTheDocument()
            })
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

            await waitFor(() =>
                expect(
                    screen.getByRole(
                        'heading',
                        { level: 4 },
                        { name: 'Submission type' }
                    )
                ).toBeInTheDocument()
            )

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
        })

        it('works even if other sections of the form have been filled out', async () => {
            const mockDocs: Document[] = [
                {
                    name: 'somedoc.pdf',
                    s3URL: 's3://bucketName/key',
                },
            ]
            const mockSubmission = mockDraft()
            mockSubmission.id = '15'
            mockSubmission.documents = mockDocs

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
                                id: '15',
                                draftSubmission: mockSubmission,
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

            await waitFor(() =>
                expect(
                    screen.getByRole(
                        'heading',
                        { level: 4 },
                        { name: 'Submission type' }
                    )
                ).toBeInTheDocument()
            )

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
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
