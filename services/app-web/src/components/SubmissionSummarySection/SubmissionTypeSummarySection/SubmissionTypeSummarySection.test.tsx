import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionTypeSummarySection } from './SubmissionTypeSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('SubmissionTypeSummarySection', () => {
    it('can render draft submission without errors', () => {
        const draftSubmission = mockContractAndRatesDraft()
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
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
        const stateSubmission = mockStateSubmission()
        renderWithProviders(
            <SubmissionTypeSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: stateSubmission.name,
            })
        ).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    })

    it('can render all submission type fields', () => {
        const draftSubmission = mockContractAndRatesDraft()
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
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
    })
    it('does not render Last Updated field', () => {
        const draftSubmission = mockStateSubmission()
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
        const draftSubmission = mockStateSubmission()
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
