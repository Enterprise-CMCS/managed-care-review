import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { MockLink } from '@apollo/client/testing'
import { DeleteContractQuestionResponse } from './DeleteContractQuestionResponse'
import { renderWithProviders } from '../../../testHelpers'
import { RoutesRecord } from '@mc-review/constants'
import {
    deleteContractQuestionResponseMockNetworkFailure,
    deleteContractQuestionResponseMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmittedWithQuestions,
    mockValidAdminUser,
    mockValidCMSUser,
} from '@mc-review/mocks'
import { SubmissionSideNav } from '../../SubmissionSideNav'

describe('DeleteContractQuestionResponse', () => {
    const contractID = 'test-abc-123'
    const questionID = 'dmco-question-1-id'
    const responseID = 'response-to-dmco-1-id'
    const division = 'dmco'
    const route = `/submissions/health-plan/${contractID}/question-and-answers/${division}/${questionID}/${responseID}/delete-response`

    const renderPage = (mocks: MockLink.MockedResponse[]) =>
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION_RESPONSE
                        }
                        element={<DeleteContractQuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: { mocks },
                routerProvider: { route },
            }
        )

    it('renders the delete response form with response docs and reason field', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        renderPage([
            fetchCurrentUserMock({
                user: mockValidAdminUser(),
                statusCode: 200,
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            fetchContractWithQuestionsMockSuccess({ contract }),
        ])

        await screen.findByRole('heading', {
            name: /Delete response/,
            level: 2,
        })
        expect(screen.getByTestId('deleteResponseReason')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Delete response' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument()
    })

    it('redirects non-admin users away from the page', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        renderPage([
            fetchCurrentUserMock({
                user: mockValidCMSUser(),
                statusCode: 200,
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            fetchContractWithQuestionsMockSuccess({ contract }),
        ])

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: /Delete response/,
                    level: 2,
                })
            ).not.toBeInTheDocument()
        })
    })

    it('renders 404 page when division URL parameter is invalid', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION_RESPONSE
                        }
                        element={<DeleteContractQuestionResponse />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                        fetchContractWithQuestionsMockSuccess({ contract }),
                    ],
                },
                routerProvider: {
                    route: `/submissions/health-plan/${contractID}/question-and-answers/not-a-division/${questionID}/${responseID}/delete-response`,
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByText('404 / Page not found')).toBeInTheDocument()
        })
    })

    it('shows validation error if no reason is provided', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        const { user } = renderPage([
            fetchCurrentUserMock({
                user: mockValidAdminUser(),
                statusCode: 200,
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            fetchContractWithQuestionsMockSuccess({ contract }),
        ])

        await screen.findByRole('heading', {
            name: /Delete response/,
            level: 2,
        })
        await user.click(
            screen.getByRole('button', { name: 'Delete response' })
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'You must provide a reason for deleting this response.'
                )
            ).toBeInTheDocument()
        })
    })

    it('successfully submits the delete mutation when a reason is provided', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        const { user } = renderPage([
            fetchCurrentUserMock({
                user: mockValidAdminUser(),
                statusCode: 200,
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            deleteContractQuestionResponseMockSuccess({
                responseID,
                reason: 'no longer applicable',
                contractID,
                questionID,
                division: 'DMCO',
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
        ])

        await screen.findByRole('heading', {
            name: /Delete response/,
            level: 2,
        })
        await user.type(
            screen.getByTestId('deleteResponseReason'),
            'no longer applicable'
        )
        await user.click(
            screen.getByRole('button', { name: 'Delete response' })
        )

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: /Delete response/,
                    level: 2,
                })
            ).not.toBeInTheDocument()
        })
    })

    it('shows an error banner if the delete mutation fails', async () => {
        const contract = mockContractPackageSubmittedWithQuestions(contractID, {
            contractSubmissionType: 'HEALTH_PLAN',
        })

        const { user } = renderPage([
            fetchCurrentUserMock({
                user: mockValidAdminUser(),
                statusCode: 200,
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            fetchContractWithQuestionsMockSuccess({ contract }),
            deleteContractQuestionResponseMockNetworkFailure({
                responseID,
                reason: 'no longer applicable',
            }),
        ])

        await screen.findByRole('heading', {
            name: /Delete response/,
            level: 2,
        })
        await user.type(
            screen.getByTestId('deleteResponseReason'),
            'no longer applicable'
        )
        await user.click(
            screen.getByRole('button', { name: 'Delete response' })
        )

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })
})
