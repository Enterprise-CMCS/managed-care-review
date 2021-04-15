import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'

import { RoutesRecord } from '../../constants/routes'
import { SubmissionType } from '../../gen/gqlClient'
import {
    fetchCurrentUserMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
} from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'

import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    it('loads Submission type step for /submissions/:id/type', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '15', statusCode: 200 }),
                    ],
                },
                routerProvider: { route: '/submissions/15/type' },
            }
        )

        const heading = await screen.findByRole('heading', {
            name: 'Submission type',
        })
        expect(heading).toBeInTheDocument()
    })

    it('shows a loading screen before data comes', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '15', statusCode: 200 }),
                    ],
                },
                routerProvider: { route: '/submissions/15/type' },
            }
        )

        // it renders immediately, so use getBy
        const loading = screen.getByText('Loading...')
        expect(loading).toBeInTheDocument()
    })

    it('shows an error screen if theres an error', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '15', statusCode: 403 }),
                    ],
                },
                routerProvider: { route: '/submissions/15/type' },
            }
        )

        // it renders immediately, so use getBy
        const loading = await screen.findByText(
            'Something went wrong, try refreshing?'
        )
        expect(loading).toBeInTheDocument()
    })

    it('loads Submission type initial values for /submissions/:id/type', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '15', statusCode: 200 }),
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

    it('loads Contract details step for /submissions/:id/contract-details', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '12', statusCode: 200 }),
                    ],
                },
                routerProvider: { route: '/submissions/12/contract-details' },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
        )
    })

    it('update type sends the update', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchDraftSubmissionMock({ id: '15', statusCode: 200 }),
                        updateDraftSubmissionMock({
                            id: 'test-abc-123',
                            updates: {
                                submissionType: 'CONTRACT_ONLY' as SubmissionType,
                                submissionDescription:
                                    'A real submissionan updated something',
                                programID: 'snbc',
                            },
                            statusCode: 200,
                        }),
                        fetchDraftSubmissionMock({
                            id: 'test-abc-123',
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
        userEvent.type(textarea, 'an updated something')

        const continueButton = await screen.findByRole('button', {
            name: 'Continue',
        })
        continueButton.click()

        await screen.findByRole('heading', {
            name: 'Contract details',
        })
    })

    it.todo('The read/write of the submission should be atomic?')
})
