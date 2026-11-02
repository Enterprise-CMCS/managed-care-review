import { RoutesRecord } from "@mc-review/constants"
import { mockContractPackageDraft, fetchCurrentUserMock, fetchContractWithQuestionsMockSuccess, fetchContractMockSuccess } from "@mc-review/mocks"
import { screen, waitFor } from "@testing-library/react"
import { NavigateFunction, Routes, Route } from "react-router-dom"
import { renderWithProviders } from "../../../testHelpers"
import { SubmissionSideNav } from "../../SubmissionSideNav"
import { StateSubmissionForm } from "../StateSubmissionForm"

describe('EBSubmissionForm', ()=> {

    it('routes EB drafts to each EB form page', async () => {
        let testNavigate: NavigateFunction
        const mockContract = {
            ...mockContractPackageDraft(),
            id: '12',
            contractSubmissionType: 'ENROLLMENT_BROKER' as const,
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
                        fetchContractWithQuestionsMockSuccess({ contract: mockContract }),
                        fetchContractMockSuccess({ contract: mockContract }),
                    ],
                },
                routerProvider: { route: '/submissions/eb/12/edit/contract-details' },
                featureFlags: { 'enrollment-broker-submissions': true },
                navigate: (nav) => (testNavigate = nav),
            }
        )

        expect(await screen.findByTestId('eb-submission-form-page')).toBeInTheDocument()
        expect(screen.getByTestId('eb-page-placeholder')).toHaveTextContent('Contract details')

        await waitFor(() => testNavigate('/submissions/eb/12/edit/contacts'))
        expect(await screen.findByText('Contacts')).toBeInTheDocument()

        await waitFor(() => testNavigate('/submissions/eb/12/edit/review-and-submit'))
        expect(await screen.findByText('Review and submit')).toBeInTheDocument()
    })
})
