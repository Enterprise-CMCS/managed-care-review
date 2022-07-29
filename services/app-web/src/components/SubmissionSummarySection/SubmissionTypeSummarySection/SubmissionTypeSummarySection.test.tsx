import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionTypeSummarySection } from './SubmissionTypeSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
    mockMNState,
} from '../../../testHelpers/apolloHelpers'

describe('SubmissionTypeSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    const statePrograms = mockMNState().programs
    it('can render draft submission without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={statePrograms}
                navigateTo="submission-type"
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

    it('can render state submission without errors', () => {
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
    })

    it('can render all draft submission type fields', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={statePrograms}
                navigateTo="submission-type"
                submissionName="MN-PMAP-0001"
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
    })
    it('can render all state submission type fields', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={{ ...stateSubmission, status: 'SUBMITTED' }}
                statePrograms={statePrograms}
                navigateTo="submission-type"
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
                navigateTo="submission-type"
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
                navigateTo="submission-type"
                headerChildComponent={<button>Test button</button>}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.queryByRole('button', { name: 'Test button' })
        ).toBeInTheDocument()
    })
})
