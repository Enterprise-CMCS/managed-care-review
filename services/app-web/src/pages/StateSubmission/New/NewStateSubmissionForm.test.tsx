import { screen, waitFor, within } from '@testing-library/react'

import {
    fetchCurrentUserMock,
    createContractMockFail,
} from '../../../testHelpers/apolloMocks'
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
                    createContractMockFail({}),
                ],
            },
            routerProvider: { route: '/submissions/new' },
        })

        expect(
            screen.getByRole('form', { name: 'New Submission Form' })
        ).toBeInTheDocument()

        const medicaid = await screen.findByText('Medicaid')
        await userEvent.click(medicaid)

        const comboBox = await screen.findByRole('combobox', {
            name: 'Programs this contract action covers (required)',
        })
        await userEvent.click(comboBox)

        const program = await screen.findByText('PMAP')
        await userEvent.click(program)

        const submissionType = await screen.findByText('Contract action only')
        await userEvent.click(submissionType)

        const contractType = await screen.findByText('Base contract')
        await userEvent.click(contractType)

        const riskBasedContractFieldSet = screen.getByText(
            /Is this a risk-based contract/
        ).parentElement
        expect(riskBasedContractFieldSet).toBeDefined()

        await userEvent.click(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            within(riskBasedContractFieldSet!).getByLabelText('No')
        )

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
