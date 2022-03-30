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
    it('can render draft submission without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={mockMNState().programs}
                navigateTo="submission-type"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: draftSubmission.name,
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
                statePrograms={mockMNState().programs}
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: stateSubmission.name,
            })
        ).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    })

    it('can render all draft submission type fields', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                statePrograms={mockMNState().programs}
                navigateTo="submission-type"
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
                submission={stateSubmission}
                navigateTo="submission-type"
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
            screen.queryByRole('definition', { name: 'Last updated' })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('definition', { name: 'Submitted' })
        ).toBeInTheDocument()
    })
    it('does not render Last Updated field', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                navigateTo="submission-type"
                showLastUpdated={false}
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Last updated' })
        ).not.toBeInTheDocument()
    })
    it('renders headerChildComponent component', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                navigateTo="submission-type"
                headerChildComponent={<button>Test button</button>}
            />
        )
        expect(
            screen.queryByRole('button', { name: 'Test button' })
        ).toBeInTheDocument()
    })
})
