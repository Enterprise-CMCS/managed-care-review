import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ContractDetailsSummarySection } from './ContractDetailsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('ContractDetailsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={draftSubmission}
                navigateTo="contract-details"
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Contract details',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Contract details' })
        ).toHaveAttribute('href', '/contract-details')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <ContractDetailsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Contract details',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('can render all contract details fields', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={draftSubmission}
                navigateTo="contract-details"
            />
        )

        expect(
            screen.getByRole('definition', { name: 'Contract action type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Contract effective dates' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Managed care entities' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Federal authority your program operates under',
            })
        ).toBeInTheDocument()
    })
})
