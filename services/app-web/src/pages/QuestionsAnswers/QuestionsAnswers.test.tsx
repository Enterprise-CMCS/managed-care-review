import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { QuestionsAnswers } from '../QuestionsAnswers'
import { ldUseClientSpy, renderWithProviders } from '../../testHelpers'
import { RoutesRecord } from '../../constants/routes'
import React from 'react'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageMockSuccess,
    mockValidCMSUser,
} from '../../testHelpers/apolloHelpers'

describe('QuestionsAnswers', () => {
    beforeEach(() => {
        ldUseClientSpy({ 'cms-questions': true })
    })
    afterEach(() => {
        jest.resetAllMocks()
    })
    it('CMS users see add questions link on Q&A page', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionsAnswers />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
            }
        )

        // Wait for sidebar nav and add question link to exist
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).toBeInTheDocument()
        })
    })
    it('State users does not see add questions link on Q&A page', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                        element={<QuestionsAnswers />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/question-and-answers',
                },
            }
        )

        // Wait for sidebar nav to exist and add questions link to not exist
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
            expect(
                screen.queryByRole('link', { name: /Add questions/ })
            ).not.toBeInTheDocument()
        })
    })
})
