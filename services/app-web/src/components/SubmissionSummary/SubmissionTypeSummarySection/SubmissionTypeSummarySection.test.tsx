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
            screen.getByRole('definition', { name: 'Program' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Submission description' })
        ).toBeInTheDocument()
    })
})
