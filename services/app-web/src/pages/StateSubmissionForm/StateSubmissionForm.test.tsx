import React from 'react'
// import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'

import { mockGetCurrentUser200 } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    it('displays a cancel link', async () => {
        renderWithProviders(<StateSubmissionForm />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() =>
            expect(
                screen.getAllByRole('link', {
                    name: 'Cancel',
                })
            ).toBeDefined()
        )
    })

    it('displays a continue button', async () => {
        renderWithProviders(<StateSubmissionForm />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() =>
            expect(
                screen.getAllByRole('button', {
                    name: 'Continue',
                })
            ).toBeDefined()
        )
    })
    it('displays a form', async () => {
        renderWithProviders(<StateSubmissionForm />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'New Submission Form' })
            ).toBeInTheDocument()
        )
    })

    describe('form steps', () => {
        it.todo('step NEW - displays submission type form')
        it.todo('step NEW - shows validations when continue button is clicked')
    })
})
