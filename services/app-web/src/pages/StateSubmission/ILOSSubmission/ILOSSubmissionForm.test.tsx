import { RoutesRecord } from '@mc-review/constants'
import {
    mockContractPackageDraft,
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    fetchContractMockSuccess,
} from '@mc-review/mocks'
import { screen, waitFor } from '@testing-library/react'
import { NavigateFunction, Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../../../testHelpers'
import { SubmissionSideNav } from '../../SubmissionSideNav'
import { StateSubmissionForm } from '../StateSubmissionForm'

describe('ILOSSubmissionForm', () => {
    it('routes ILOS drafts to each ILOS form page', async () => {
        let testNavigate: NavigateFunction
        const mockContract = {
            ...mockContractPackageDraft(),
            id: '12',
            contractSubmissionType: 'ILOS' as const,
        }

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                        element={<StateSubmissionForm />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: mockContract,
                        }),
                        // The ILOS actuarial report page and Contacts each fetch the draft
                        fetchContractMockSuccess({ contract: mockContract }),
                        fetchContractMockSuccess({ contract: mockContract }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/ilos/12/edit/type',
                },
                featureFlags: { 'ilos-submissions': true },
                navigate: (nav) => (testNavigate = nav),
            }
        )

        expect(
            await screen.findByTestId('ilos-submission-form-page')
        ).toBeInTheDocument()
        expect(
            screen.getByTestId('ilos-submission-details-placeholder')
        ).toBeInTheDocument()

        await waitFor(() =>
            testNavigate(
                '/submissions/ilos/12/edit/associated-rate-certifications'
            )
        )
        expect(
            await screen.findByTestId('associatedRateCertifications')
        ).toBeInTheDocument()

        await waitFor(() => testNavigate('/submissions/ilos/12/edit/contacts'))
        expect(
            await screen.findByRole('heading', { name: 'State contacts' })
        ).toBeInTheDocument()

        await waitFor(() =>
            testNavigate('/submissions/ilos/12/edit/review-and-submit')
        )
        expect(
            await screen.findByTestId('ilos-review-submit')
        ).toBeInTheDocument()
    })

    it('shows a 404 for ILOS form pages when the ILOS flag is off', async () => {
        const mockContract = {
            ...mockContractPackageDraft(),
            id: '12',
            contractSubmissionType: 'ILOS' as const,
        }

        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                        element={<StateSubmissionForm />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: mockContract,
                        }),
                        fetchContractMockSuccess({ contract: mockContract }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/ilos/12/edit/associated-rate-certifications',
                },
                featureFlags: { 'ilos-submissions': false },
            }
        )

        expect(
            await screen.findByText('404 / Page not found')
        ).toBeInTheDocument()
        expect(
            screen.queryByTestId('ilos-submission-form-page')
        ).not.toBeInTheDocument()
    })
})
