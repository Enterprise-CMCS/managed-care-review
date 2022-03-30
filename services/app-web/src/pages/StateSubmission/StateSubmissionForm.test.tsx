import { screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { Document } from '../../gen/gqlClient'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchSubmission2Mock,
    updateDraftSubmissionMock,
    mockDraftSubmission2,
    mockUnlockedSubmission2,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

import { StateSubmissionForm } from './StateSubmissionForm'
import { updatesFromSubmission2 } from './updateSubmissionTransform'

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
                            fetchSubmission2Mock({
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
            const mockSubmission = mockDraftSubmission2({
                submissionDescription: 'A real submission',
                submissionType: 'CONTRACT_ONLY',
                programIDs: ['snbc'],
            })
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchSubmission2Mock({
                                id: '15',
                                statusCode: 200,
                                submission: mockSubmission,
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
            expect(description.textContent).toBe('A real submission')

            expect(
                await screen.findByLabelText('Contract action only')
            ).toBeChecked()

            // in react-select, only items that are selected have a "remove item" label
            await waitFor(() => {
                expect(screen.getByLabelText('Remove SNBC')).toBeInTheDocument()
            })
        })

        it('loads contract details fields for /submissions/:id/contract-details with amendments', async () => {
            const mockAmendment = mockDraftSubmission2({
                contractType: 'AMENDMENT',
                contractAmendmentInfo: {
                    itemsBeingAmended: [
                        'CAPITATION_RATES',
                        'GEO_AREA_SERVED',
                        'OTHER',
                    ],
                    otherItemBeingAmended: 'foobar',
                    capitationRatesAmendedInfo: {
                        reason: 'MIDYEAR',
                    },
                    relatedToCovid19: true,
                    relatedToVaccination: false,
                },
            })

            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchSubmission2Mock({
                                id: '12',
                                statusCode: 200,
                                submission: mockAmendment,
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
                            fetchSubmission2Mock({
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
                expect(
                    screen.getByText(
                        'Upload any additional supporting documents'
                    )
                ).toBeInTheDocument()
                expect(screen.getByTestId('file-input')).toBeInTheDocument()
            })
        })
    })

    describe('loads unlocked submission', () => {
        it('displays unlock banner with correct data for an unlocked submission', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchSubmission2Mock({
                                id: '15',
                                statusCode: 200,
                                submission: mockUnlockedSubmission2(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/documents',
                    },
                }
            )

            const banner = expect(await screen.findByTestId('unlockedBanner'))
            banner.toBeInTheDocument()
            banner.toHaveClass('usa-alert--info')
            banner.toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i
            )
            banner.toHaveTextContent('Unlocked by: bob@dmas.mn.govUnlocked')
            banner.toHaveTextContent('Reason for unlock: Test unlock reason')
        })
    })

    describe('when user edits submission', () => {
        it('change draft submission description and navigate to contract details', async () => {
            const mockSubmission = mockDraftSubmission2({
                submissionDescription:
                    'A real submission but updated something',
            })
            const mockUpdate = updatesFromSubmission2(mockSubmission)
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
                            fetchSubmission2Mock({
                                submission: mockSubmission,
                                id: '15',
                                statusCode: 200,
                            }),
                            updateDraftSubmissionMock({
                                id: '15',
                                updates: mockUpdate,
                                statusCode: 200,
                            }),
                            fetchSubmission2Mock({
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
                    screen.getByRole('form', { name: 'Submission Type Form' })
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
                    documentCategories: ['CONTRACT_RELATED'],
                },
            ]
            const mockSubmission = mockDraftSubmission2({
                id: '15',
                documents: mockDocs,
            })

            const mockUpdate = updatesFromSubmission2(mockSubmission)
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
                            fetchSubmission2Mock({
                                id: '15',
                                submission: mockSubmission,
                                statusCode: 200,
                            }),
                            updateDraftSubmissionMock({
                                id: '15',
                                updates: mockUpdate,
                                statusCode: 200,
                            }),
                            fetchSubmission2Mock({
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
                    screen.getByRole('form', { name: 'Submission Type Form' })
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
                            fetchSubmission2Mock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/type' },
                }
            )

            const loading = await screen.findByText('System error')
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
                            fetchSubmission2Mock({
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

            const loading = await screen.findByText('System error')
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
                            fetchSubmission2Mock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/documents' },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })
    })
})
