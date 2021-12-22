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

    it('can render draft submission without errors (review and submit behavior)', () => {
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
        expect(
            screen.queryByRole('button', {
                name: 'Download all contract documents',
            })
        ).toBeNull()
    })

    it('can render state submission on summary page without errors (submission summary behavior)', () => {
        renderWithProviders(
            <ContractDetailsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Contract details',
            })
        ).toBeInTheDocument()
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Download all contract documents',
            })
        ).toBeInTheDocument()
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
        expect(
            screen.getByRole('definition', {
                name: 'Items being amended',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Is this contract action related to the COVID-19 public health emergency',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Is this related to coverage and reimbursement for vaccine administration?',
            })
        ).toBeInTheDocument()
    })

    it('can hide contract amendment fields for base contract submission', () => {
        renderWithProviders(
            <ContractDetailsSummarySection submission={stateSubmission} />
        )

        expect(
            screen.queryByText('Items being amended')
        ).not.toBeInTheDocument()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency'
            )
        ).not.toBeInTheDocument()
        expect(
            screen.queryByText(
                'Is this related to coverage and reimbursement for vaccine administration?'
            )
        ).not.toBeInTheDocument()
    })
})
