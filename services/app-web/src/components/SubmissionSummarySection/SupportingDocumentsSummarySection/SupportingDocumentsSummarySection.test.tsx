import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SupportingDocumentsSummarySection } from './SupportingDocumentsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('SupportingDocumentsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <SupportingDocumentsSummarySection
                submission={draftSubmission}
                navigateTo="documents"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Supporting documents',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Supporting documents' })
        ).toHaveAttribute('href', '/documents')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <SupportingDocumentsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Supporting documents',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
})
