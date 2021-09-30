import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { DocumentsSummarySection } from './DocumentsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('DocumentsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <DocumentsSummarySection
                submission={draftSubmission}
                navigateTo="documents"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Documents',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Documents' })
        ).toHaveAttribute('href', '/documents')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <DocumentsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Documents',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
})
