import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { SubmissionTypeSummarySectionV2 as SubmissionTypeSummarySection } from './SubmissionTypeSummarySectionV2'
import {
    mockContractPackageDraft,
    mockMNState,
    mockContractPackageSubmitted,
    fetchCurrentUserMock,
    mockValidStateUser,
} from '../../../../../testHelpers/apolloMocks'

describe('SubmissionTypeSummarySection', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    const draftContract = mockContractPackageDraft()
    const stateSubmission = mockContractPackageSubmitted()
    const statePrograms = mockMNState().programs

    it('can render draft package without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'MN-PMAP-0001',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit MN-PMAP-0001' })
        ).toHaveAttribute('href', '/submission-type')

        // Our mocks use the latest package data by default.
        // Therefore we can check here that missing field is not being displayed unexpectedly
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('can render submitted package without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={stateSubmission}
                statePrograms={statePrograms}
                submissionName="MN-MSHO-0003"
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'MN-MSHO-0003',
            })
        ).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('renders expected fields for draft package on review and submit', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />
        )

        expect(
            screen.getByRole('definition', { name: 'Program(s)' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: /Is this a risk based contract/,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Contract action type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission description' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: /Which populations does this contract action cover\?/,
            })
        ).toBeInTheDocument()
    })

    it('renders missing field message for population coverage question when expected', () => {
        const draftContract = mockContractPackageDraft()
        if (draftContract.draftRevision) {
            draftContract.draftRevision.formData.populationCovered = undefined

            renderWithProviders(
                <SubmissionTypeSummarySection
                    contract={draftContract}
                    statePrograms={statePrograms}
                    editNavigateTo="submission-type"
                    submissionName="MN-PMAP-0001"
                    isStateUser={true}
                />
            )
        }
        expect(
            screen.getByRole('definition', {
                name: /Which populations does this contract action cover\?/,
            })
        ).toBeInTheDocument()
        const riskBasedDefinitionParentDiv = screen.getByRole('definition', {
            name: /Which populations does this contract action cover\?/,
        })
        if (!riskBasedDefinitionParentDiv) throw Error('Testing error')
        expect(riskBasedDefinitionParentDiv).toHaveTextContent(
            /You must provide this information/
        )
    })

    it('renders missing field message for risk based contract when expected', () => {
        const draftContract = mockContractPackageDraft()
        if (draftContract.draftRevision) {
            draftContract.draftRevision.formData.riskBasedContract = undefined

            renderWithProviders(
                <SubmissionTypeSummarySection
                    contract={draftContract}
                    statePrograms={statePrograms}
                    editNavigateTo="submission-type"
                    submissionName="MN-PMAP-0001"
                    isStateUser={true}
                />
            )
        }
        expect(
            screen.getByRole('definition', { name: 'Program(s)' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: /Is this a risk based contract/,
            })
        ).toBeInTheDocument()
        const riskBasedDefinitionParentDiv = screen.getByRole('definition', {
            name: /Is this a risk based contract/,
        })
        if (!riskBasedDefinitionParentDiv) throw Error('Testing error')
        expect(riskBasedDefinitionParentDiv).toHaveTextContent(
            /You must provide this information/
        )
    })

    it('renders expected fields for submitted package on submission summary', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={{ ...stateSubmission, status: 'SUBMITTED' }}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                isStateUser={true}
            />
        )
        expect(
            screen.getByRole('definition', { name: 'Program(s)' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission description' })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('definition', { name: 'Submitted' })
        ).toBeInTheDocument()
    })

    it('does not render Submitted at field', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Submitted' })
        ).not.toBeInTheDocument()
    })

    it('renders headerChildComponent component', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                headerChildComponent={<button>Test button</button>}
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('button', { name: 'Test button' })
        ).toBeInTheDocument()
    })

    it('does not render fields with missing fields for submitted package on submission summary', () => {
        const stateSubmission = mockContractPackageSubmitted()
        const submittedPackage = stateSubmission.packageSubmissions[0]
        submittedPackage.contractRevision.formData = {
            ...submittedPackage.contractRevision.formData,
            submissionDescription: '',
            programIDs: [],
        }
        stateSubmission.packageSubmissions[0] = submittedPackage

        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={{ ...stateSubmission, status: 'SUBMITTED' }}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Program(s)' })
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('definition', { name: 'Submission description' })
        ).not.toBeInTheDocument()
    })
})
