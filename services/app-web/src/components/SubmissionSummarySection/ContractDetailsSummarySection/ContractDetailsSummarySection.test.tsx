import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ContractDetailsSummarySection } from './ContractDetailsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloHelpers'

describe('ContractDetailsSummarySection', () => {
    const draftContractAndRatesSubmission = mockContractAndRatesDraft()
    const stateBaseContractOnlySubmission = mockStateSubmission()

    it('can render draft submission without errors (review and submit behavior)', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={draftContractAndRatesSubmission}
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
            <ContractDetailsSummarySection submission={stateBaseContractOnlySubmission} />
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
                submission={draftContractAndRatesSubmission}
                navigateTo="contract-details"
            />
        )

        expect(
            screen.getByRole('definition', { name: 'Contract action type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Contract amendment effective dates' })
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

    it('displays correct text content for contract a base contract', () => {
        renderWithProviders(
            <ContractDetailsSummarySection submission={stateBaseContractOnlySubmission} />
        )
        expect(screen.getByText('Contract effective dates')).toBeInTheDocument()
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

      it('displays correct text content for a contract amendment', () => {
          renderWithProviders(
            <ContractDetailsSummarySection submission={draftContractAndRatesSubmission} />
        )
         expect(screen.getByText('Contract amendment effective dates')).toBeInTheDocument()
        expect(
            screen.queryByText('Items being amended')
        ).toBeInTheDocument()

                expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency'
            )
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'Is this related to coverage and reimbursement for vaccine administration?'
            )
        ).toBeInTheDocument()
    })
})
