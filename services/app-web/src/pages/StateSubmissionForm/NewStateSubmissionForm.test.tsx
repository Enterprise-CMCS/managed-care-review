import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { getCurrentUserMock } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { NewStateSubmissionForm } from './NewStateSubmissionForm'

describe('NewStateSubmissionForm', () => {
    it('loads Submission type step for /submissions/new', async () => {
        renderWithProviders(<NewStateSubmissionForm />, {
            apolloProvider: {
                mocks: [
                    getCurrentUserMock({ statusCode: 200 }),
                    getCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new' },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'Submission type' })
            ).toBeInTheDocument()
        )
    })
})
