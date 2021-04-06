import { findByText, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'

import { RoutesRecord } from '../../constants/routes'
import {
    getCurrentUserMock,
    showDraftSubmissionMock,
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
                        getCurrentUserMock({ statusCode: 200 }),
                        showDraftSubmissionMock({ id: '15', statusCode: 200 }),
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
                        getCurrentUserMock({ statusCode: 200 }),
                        showDraftSubmissionMock({ id: '15', statusCode: 200 }),
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
                        getCurrentUserMock({ statusCode: 200 }),
                        showDraftSubmissionMock({ id: '15', statusCode: 403 }),
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
                        getCurrentUserMock({ statusCode: 200 }),
                        showDraftSubmissionMock({ id: '15', statusCode: 200 }),
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
                        getCurrentUserMock({ statusCode: 200 }),
                        showDraftSubmissionMock({ id: '12', statusCode: 200 }),
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
})
