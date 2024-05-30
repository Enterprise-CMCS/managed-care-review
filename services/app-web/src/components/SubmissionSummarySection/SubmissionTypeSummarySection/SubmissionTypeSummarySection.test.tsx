import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionTypeSummarySection } from './SubmissionTypeSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
    mockMNState,
} from '../../../testHelpers/apolloMocks'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'

describe('SubmissionTypeSummarySection', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    const statePrograms = mockMNState().programs

    it('can render draft package without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
            />
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
    })

    it('can render submitted package without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={stateSubmission}
                statePrograms={statePrograms}
                submissionName="MN-MSHO-0003"
            />
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
                submission={draftSubmission}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
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
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={
                    {
                        ...draftSubmission,
                        populationCovered: undefined,
                    } as unknown as HealthPlanFormDataType
                } // allow type coercion to be able to test edge case
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
            />
        )

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
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={
                    {
                        ...draftSubmission,
                        riskBasedContract: undefined,
                    } as unknown as HealthPlanFormDataType
                } // allow type coercion to be able to test edge case
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
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
                submission={{ ...stateSubmission, status: 'SUBMITTED' }}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
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
                submission={draftSubmission}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Submitted' })
        ).not.toBeInTheDocument()
    })
    it('renders headerChildComponent component', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={statePrograms}
                editNavigateTo="submission-type"
                headerChildComponent={<button>Test button</button>}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.queryByRole('button', { name: 'Test button' })
        ).toBeInTheDocument()
    })
})
