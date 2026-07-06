import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { AdminUploadContractResponse } from '../../QuestionResponse'
import { renderWithProviders } from '../../../testHelpers'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    indexUsersQueryMock,
    mockContractPackageSubmittedWithQuestions,
    mockValidAdminUser,
} from '@mc-review/mocks'

const renderAdminUploadResponse = () => {
    const contract = mockContractPackageSubmittedWithQuestions()
    return renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_ADMIN_UPLOAD_CONTRACT_RESPONSE}
                element={<AdminUploadContractResponse />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract: {
                            ...contract,
                            id: '15',
                            contractSubmissionType: 'HEALTH_PLAN',
                        },
                    }),
                    indexUsersQueryMock(),
                ],
            },
            routerProvider: {
                route: `/submissions/health-plan/15/question-and-answers/dmco-question-1-id/admin-upload-response`,
            },
        }
    )
}

describe('AdminUploadContractResponse', () => {
    it('renders the response form with a user picker, response date, and reason', async () => {
        renderAdminUploadResponse()

        expect(
            await screen.findByRole('combobox', {
                name: 'Respond on behalf of',
            })
        ).toBeInTheDocument()

        // The round/division summary the state user sees is shown
        expect(screen.getByText('Round 1')).toBeInTheDocument()
        expect(
            screen.getByText(/Asked by: Division of Managed Care Operations/)
        ).toBeInTheDocument()
        expect(screen.getByText('Response date')).toBeInTheDocument()
        expect(screen.getByLabelText('Reason')).toBeInTheDocument()
        // No division field on the response form
        expect(
            screen.queryByRole('combobox', { name: 'Division' })
        ).not.toBeInTheDocument()
    })

    it('requires a reason and its error summary link points to the field', async () => {
        const user = userEvent.setup()
        renderAdminUploadResponse()

        const submit = await screen.findByRole('button', {
            name: 'Add response',
        })
        await user.click(submit)

        expect(
            (await screen.findAllByText('You must provide a reason')).length
        ).toBeGreaterThan(0)

        // Error summary link points to (and can focus) the reason field.
        const reasonLink = screen.getByRole('link', {
            name: 'You must provide a reason',
        })
        expect(reasonLink).toHaveAttribute('href', '#reason')
        expect(document.getElementById('reason')).toBeInTheDocument()
    })
})
