import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { fetchCurrentUserMock } from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { NewStateSubmissionForm } from './NewStateSubmissionForm'

describe('NewStateSubmissionForm', () => {
    it('loads Submission type step for /submissions/new', async () => {
        renderWithProviders(<NewStateSubmissionForm />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new' },
        })

        await waitFor(() =>
            expect(
                screen.getByRole(
                    'heading',
                    { level: 2 },
                    { name: 'Submission type' }
                )
            ).toBeInTheDocument()
        )
    })
})
