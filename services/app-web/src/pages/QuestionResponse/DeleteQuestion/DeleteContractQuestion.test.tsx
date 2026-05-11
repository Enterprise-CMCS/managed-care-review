import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { MockLink } from '@apollo/client/testing'
import { DeleteContractQuestion } from './DeleteContractQuestion'
import { renderWithProviders } from '../../../testHelpers'
import { RoutesRecord } from '@mc-review/constants'
import {
    deleteContractQuestionMockNetworkFailure,
    deleteContractQuestionMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmittedWithQuestions,
    mockValidAdminUser,
    mockValidCMSUser,
} from '@mc-review/mocks'
import { SubmissionSideNav } from '../../SubmissionSideNav'

describe('DeleteContractQuestion', () => {
    const contractID = 'test-abc-123'
    const questionID = 'dmco-question-1-id'
    const division = 'dmco'
    const route = `/submissions/health-plan/${contractID}/question-and-answers/${division}/${questionID}/delete-question`

    const renderPage = (mocks: MockLink.MockedResponse[]) =>
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION}
                        element={<DeleteContractQuestion />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: { mocks },
                routerProvider: { route },
            }
        )

    it('renders the delete question form with question docs and reason field', async () => {
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
            name: /Delete question/,
            level: 2,
        })
        expect(screen.getByTestId('deleteQuestionReason')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Delete question' })
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
                    name: /Delete question/,
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
                        path={RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION}
                        element={<DeleteContractQuestion />}
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
                    route: `/submissions/health-plan/${contractID}/question-and-answers/not-a-division/${questionID}/delete-question`,
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
            name: /Delete question/,
            level: 2,
        })
        await user.click(
            screen.getByRole('button', { name: 'Delete question' })
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'You must provide a reason for deleting this question.'
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
            deleteContractQuestionMockSuccess({
                questionID,
                reason: 'no longer applicable',
                contractID,
                division: 'DMCO',
            }),
            fetchContractWithQuestionsMockSuccess({ contract }),
        ])

        await screen.findByRole('heading', {
            name: /Delete question/,
            level: 2,
        })
        await user.type(
            screen.getByTestId('deleteQuestionReason'),
            'no longer applicable'
        )
        await user.click(
            screen.getByRole('button', { name: 'Delete question' })
        )

        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: /Delete question/,
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
            deleteContractQuestionMockNetworkFailure({
                questionID,
                reason: 'no longer applicable',
            }),
        ])

        await screen.findByRole('heading', {
            name: /Delete question/,
            level: 2,
        })
        await user.type(
            screen.getByTestId('deleteQuestionReason'),
            'no longer applicable'
        )
        await user.click(
            screen.getByRole('button', { name: 'Delete question' })
        )

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })
})
