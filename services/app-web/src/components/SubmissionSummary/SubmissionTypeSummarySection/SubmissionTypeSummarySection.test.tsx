import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionTypeSummarySection } from './SubmissionTypeSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('SubmissionTypeSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render draft submission without errors', () => {
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
        renderWithProviders(
            <SubmissionTypeSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: stateSubmission.name,
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('can render all submission type fields', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                submission={draftSubmission}
                navigateTo="submission-type"
            />
        )

        expect(
            screen.getByRole('definition', { name: 'Program' })
        ).toBeInTheDocument()
        // Why is the name of the element not Submission type
        // expect(screen.getByRole('definitions', { name: 'Submission type' })).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission description' })
        ).toBeInTheDocument()
    })
})
