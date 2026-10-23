import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { AttestationsSummarySection } from './AttestationsSummarySection'
import { mockContractPackageDraft } from '@mc-review/mocks'

describe('AttestationsSummarySection', () => {
    it('renders attestation field with edit link', () => {
        const draft = mockContractPackageDraft()
        draft.draftRevision!.formData.procurementAttestation = true

        renderWithProviders(
            <AttestationsSummarySection
                contract={draft}
                editNavigateTo="attestations"
                isStateUser
                explainMissingData
            />
        )

        expect(
            screen.getByRole('heading', { level: 2, name: 'Attestations' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Attestations' })
        ).toHaveAttribute('href', '/attestations')
        expect(
            screen.getByText('Compliance with procurement requirements')
        ).toBeInTheDocument()
        expect(
            screen.getByText(/The state has attested that the procurement/)
        ).toBeInTheDocument()
    })

    it('explains missing data when attestation is missing', () => {
        renderWithProviders(
            <AttestationsSummarySection
                contract={mockContractPackageDraft()}
                editNavigateTo="attestations"
                isStateUser
                explainMissingData
            />
        )

        expect(
            screen.queryByText(/The state has attested/)
        ).not.toBeInTheDocument()
        expect(
            screen.getByText(/You must provide this information/)
        ).toBeInTheDocument()
    })
})
