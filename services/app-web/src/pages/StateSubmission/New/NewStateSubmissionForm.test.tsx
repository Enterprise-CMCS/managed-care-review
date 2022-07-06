import { screen, waitFor } from '@testing-library/react'

import {
    fetchCurrentUserMock,
    createHealthPlanPackageMockAuthFailure,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { NewStateSubmissionForm } from './NewStateSubmissionForm'
import userEvent from '@testing-library/user-event'

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
    it('displays generic error banner when creating new health plan package fails', async () => {
        renderWithProviders(<NewStateSubmissionForm />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                    createHealthPlanPackageMockAuthFailure(),
                ],
            },
            routerProvider: { route: '/submissions/new' },
        })

        expect(
            screen.getByRole('form', { name: 'New Submission Form' })
        ).toBeInTheDocument()

        const comboBox = await screen.findByRole('combobox', {
            name: 'programs (required)',
        })
        await userEvent.click(comboBox)

        const program = await screen.findByText('PMAP')
        await userEvent.click(program)

        const submissionType = await screen.findByText('Contract action only')
        await userEvent.click(submissionType)

        const textarea = await screen.findByRole('textbox', {
            name: 'Submission description',
        })
        await userEvent.type(textarea, 'A submitted submission')

        const continueButton = await screen.findByRole('button', {
            name: 'Continue',
        })
        await userEvent.click(continueButton)

        await waitFor(() => {
            expect(screen.getByText('System error')).toBeInTheDocument()
        })
    })
})
