import { Contract, ContractFormData } from '../../../../gen/gqlClient'
import {
    fetchContractMockSuccess,
    fetchCurrentUserMock,
    mockContractFormData,
    mockContractPackageDraft,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import { EQROReviewSubmit } from './EQROReviewSubmit'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { waitFor, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockEQROFormData = (
    overrides?: Partial<ContractFormData>
): ContractFormData => {
    return mockContractFormData({
        populationCovered: 'MEDICAID_AND_CHIP',
        contractType: 'BASE',
        submissionType: 'CONTRACT_ONLY',
        managedCareEntities: ['MCO'],
        eqroNewContractor: true,
        eqroProvisionMcoNewOptionalActivity: true,
        eqroProvisionNewMcoEqrRelatedActivities: false,
        eqroProvisionChipEqrRelatedActivities: true,
        eqroProvisionMcoEqrOrRelatedActivities: null,
        ...overrides,
    })
}
const testEQROContract = (
    contractOverrides?: Partial<Contract>,
    formDataOverrides?: Partial<ContractFormData>
): Contract => {
    const contract = mockContractPackageDraft({
        contractSubmissionType: 'EQRO',
        ...contractOverrides,
    })

    contract.draftRevision!.formData = mockEQROFormData(formDataOverrides)

    return contract
}

it('renders EQRO fields', async () => {
    const testData = testEQROContract({
        id: 'test-id',
    })

    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={<EQROReviewSubmit />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: testData,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/eqro/test-id/edit/review-and-submit',
            },
        }
    )

    await waitFor(() => {
        expect(
            screen.getByText('Is this contract with a new EQRO contractor')
        ).toBeInTheDocument()
    })

    const withinInclude = within(
        screen.getByLabelText(
            'This contract action includes new or modified provisions related to the following'
        )
    )
    const withinExclude = within(
        screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
    )

    //expect included provisions
    expect(
        withinInclude.getByText(
            'New optional activities to be performed on MCOs in accordance with 42 CFR § 438.358(c)'
        )
    ).toBeInTheDocument()
    expect(
        withinInclude.getByText(
            'EQR-related activities performed on the CHIP population'
        )
    ).toBeInTheDocument()

    //expect excluded provisions
    expect(
        withinExclude.getByText(
            'EQR-related activities for a new MCO managed care program'
        )
    ).toBeInTheDocument()

    // expect provisions to not be shown
    expect(
        screen.queryByText('EQR or EQR-related activities performed on MCOs')
    ).toBeNull()
})

it('does not render EQRO fields when conditions are unmet', async () => {
    const testData = testEQROContract(
        {
            id: 'test-id',
        },
        mockEQROFormData({
            contractType: 'BASE',
            populationCovered: 'MEDICAID',
            managedCareEntities: ['PCCM'],
        })
    )

    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={<EQROReviewSubmit />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: testData,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/eqro/test-id/edit/review-and-submit',
            },
        }
    )

    await waitFor(() => {
        expect(
            screen.queryByText('Contract effective dates')
        ).toBeInTheDocument()
    })

    //expect provision fields to not be on screen
    expect(
        screen.queryByText(
            'This contract action includes new or modified provisions related to the following'
        )
    ).toBeNull()
    expect(
        screen.queryByText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
    ).toBeNull()
})

it('renders 404 error page on health plan submission', async () => {
    const testData = testEQROContract(
        {
            id: 'test-id',
            contractSubmissionType: 'HEALTH_PLAN',
        },
        mockEQROFormData({
            contractType: 'BASE',
            populationCovered: 'MEDICAID',
            managedCareEntities: ['PCCM'],
        })
    )

    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={<EQROReviewSubmit />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: testData,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/eqro/test-id/edit/review-and-submit',
            },
        }
    )

    await waitFor(() => {
        expect(screen.queryByText('System error')).toBeInTheDocument()
        expect(
            screen.queryByText(
                /We're having trouble loading this page. Please refresh your browser and if you continue to experience an error/
            )
        ).toBeInTheDocument()
    })
})

it('opens submit modal', async () => {
    const testData = testEQROContract({
        id: 'test-id',
    })

    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                element={<EQROReviewSubmit />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: testData,
                    }),
                ],
            },
            routerProvider: {
                route: '/submissions/eqro/test-id/edit/review-and-submit',
            },
        }
    )

    await waitFor(() => {
        expect(
            screen.getByTestId('eqro-review-submit-modal-open-button')
        ).toBeInTheDocument()
    })

    await userEvent.click(
        screen.getByTestId('eqro-review-submit-modal-open-button')
    )

    expect(screen.getByText('Ready to submit?')).toBeInTheDocument()
    expect(
        screen.getByText(
            'When you click submit, your responses determine whether this submission is subject to formal CMS review and approval.'
        )
    ).toBeInTheDocument()
})
