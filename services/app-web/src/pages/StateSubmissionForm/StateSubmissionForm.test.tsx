import { screen, waitFor } from '@testing-library/react'
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

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'Submission type' })
            ).toBeInTheDocument()
        )
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
