import React from 'react'
import { screen } from '@testing-library/react'

import { fetchCurrentUserMock } from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { NewStateSubmissionForm } from './NewStateSubmissionForm'

describe('NewStateSubmissionForm', () => {
    it('loads the correct form in /submissions/new', async () => {
        renderWithProviders(<NewStateSubmissionForm />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new' },
        })
  
        expect(
            screen.getByRole('form', { name: 'New Submission Form' })
        ).toBeInTheDocument()

    })
})
