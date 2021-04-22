import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
} from '../../utils/apolloUtils'
import { SubmissionType as SubmissionTypeT } from '../../gen/gqlClient'
import { renderWithProviders } from '../../utils/jestUtils'

import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    describe('loads draft submission', () => {
        // TODO: figure out why this test failing
        it.skip('loads submission type fields for /submissions/:id/type', async () => {
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
                                    submissionType: 'CONTRACT_ONLY' as SubmissionTypeT,
                                    submissionDescription:
                                        'A real submission but updated something',
                                    programID: 'snbc',
                                },
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
            //     const history = createMemoryHistory()
            //     renderWithProviders(
            //         <Route
            //             path={RoutesRecord.SUBMISSIONS_FORM}
            //             component={StateSubmissionForm}
            //         />,
            //         {
            //             apolloProvider: {
            //                 mocks: [
            //                     fetchCurrentUserMock({ statusCode: 200 }),
            //                     fetchDraftSubmissionMock({
            //                         id: '15',
            //                         statusCode: 200,
            //                     }),
            //                     updateDraftSubmissionMock({
            //                         id: '15',
            //                         updates: {
            //                             submissionDescription: 'a new description',
            //                         },
            //                         statusCode: 200,
            //                     }),
            //                 ],
            //             },
            //             routerProvider: {
            //                 route: '/submissions/15/type',
            //                 routerProps: { history: history },
            //             },
            //         }
            //     )

            //     expect(
            //         await screen.findByRole('heading', { name: 'Submission type' })
            //     ).toBeInTheDocument()

            //     userEvent.type(screen.getByRole('textbox'), 'a new description')

            //     userEvent.click(
            //         screen.getByRole('button', {
            //             name: 'Continue',
            //         })
            //     )
            //     await waitFor(() => {
            //         expect(history.location.pathname).toBe(
            //             '/submissions/15/contract-details'
            //         )
            //     })
            // })
        })
    })

    describe('errors', () => {
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
