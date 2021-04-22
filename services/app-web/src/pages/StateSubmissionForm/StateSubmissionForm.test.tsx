import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import userEvent from '@testing-library/user-event'

import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
} from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'

import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    describe('edit submission', () => {
        // This test is not working, needs another look later
        it.skip('edit submission type and and navigate to contract details', async () => {
            const history = createMemoryHistory()
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
                            updateDraftSubmissionMock({
                                id: '15',
                                updates: {
                                    submissionDescription: 'a new description',
                                },
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/type',
                        routerProps: { history: history },
                    },
                }
            )

            expect(
                await screen.findByRole('heading', { name: 'Submission type' })
            ).toBeInTheDocument()

            userEvent.type(screen.getByRole('textbox'), 'a new description')

            userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )
            await waitFor(() => {
                expect(history.location.pathname).toBe(
                    '/submissions/15/contract-details'
                )
            })
        })
    })

    describe('navigate each form step', () => {
        it('loads submission type step for /submissions/:id/type', async () => {
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

        it('loads contract details step for /submissions/:id/contract-details', async () => {
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

        it('loads documents step for /submissions/:id/documents', async () => {
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

    describe('form data handling', () => {
        it('shows an error fetching submission fails at submission type', async () => {
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
        it('shows an error fetching submission fails at contract details', async () => {
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
        it('shows an error fetching submission fails at documents', async () => {
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
