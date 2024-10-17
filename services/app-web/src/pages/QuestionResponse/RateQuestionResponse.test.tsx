import {
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { RateRevision } from '../../gen/gqlClient'
import { renderWithProviders } from '../../testHelpers'
import { Route, Routes } from 'react-router-dom'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '../../constants'
import { QuestionResponse } from './QuestionResponse'
import { SubmissionSummary } from '../SubmissionSummary'
import { RateQuestionResponse } from './RateQuestionResponse'
import { screen, waitFor } from '@testing-library/react'
import { fetchRateWithQuestionsMockSuccess } from '../../testHelpers/apolloMocks/rateGQLMocks'

describe('RateQuestionResponse', () => {
    const CommonRoutes = () => (
        <Routes>
            <Route element={<SubmissionSideNav />}>
                <Route
                    path={RoutesRecord.SUBMISSIONS_QUESTIONS_AND_ANSWERS}
                    element={<QuestionResponse />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                    element={<SubmissionSummary />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS}
                    element={<RateQuestionResponse />}
                />
            </Route>
        </Routes>
    )
    it('renders rate certification name', async () => {
        const contract = mockContractPackageSubmitted()
        const rateRevision = contract.packageSubmissions[0].rateRevisions[0]
        const secondRateRev: RateRevision = {
            ...rateRevision,
            id: 'second-rate-revision',
            rateID: 'second-rate',
            formData: {
                ...rateRevision.formData,
                rateProgramIDs: ['ea16a6c0-5fc6-4df8-adac-c627e76660ab'],
                rateCertificationName: 'MCR-MN-MSC+',
            },
        }
        contract.packageSubmissions[0].rateRevisions.push(secondRateRev)
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidStateUser(),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract: {
                            ...contract,
                            id: '15',
                        },
                    }),
                    fetchRateWithQuestionsMockSuccess(
                        { id: secondRateRev.rateID },
                        secondRateRev
                    ),
                ],
            },
            routerProvider: {
                route: '/submissions/15/rate/second-rate/question-and-answers',
            },
            featureFlags: {
                'qa-by-rates': true,
            },
        })

        // Wait for sidebar nav to exist.
        await waitFor(() => {
            expect(screen.queryByTestId('sidenav')).toBeInTheDocument()
        })

        expect(
            screen.getByRole('heading', {
                name: `Rate questions: ${secondRateRev.formData.rateCertificationName}`,
            })
        ).toBeInTheDocument()
    })

    it('renders error page if rate is in draft', async () => {
        const contract = mockContractPackageSubmitted()
        contract.packageSubmissions[0].rateRevisions = []
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidStateUser(),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract: {
                            ...contract,
                            id: '15',
                        },
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/15/rate/second-rate/question-and-answers',
            },
            featureFlags: {
                'qa-by-rates': true,
            },
        })

        await waitFor(() => {
            expect(screen.getByText('System error')).toBeInTheDocument()
        })
    })

    it('renders error page if rate revision does not exist', async () => {
        const draftContract = mockContractPackageDraft()
        renderWithProviders(<CommonRoutes />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidStateUser(),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract: {
                            ...draftContract,
                            id: '15',
                        },
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/15/rate/second-rate/question-and-answers',
            },
            featureFlags: {
                'qa-by-rates': true,
            },
        })

        await waitFor(() => {
            expect(screen.getByText('System error')).toBeInTheDocument()
        })
    })
})
