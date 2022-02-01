import { screen,waitFor,within } from '@testing-library/react'
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
            <ContractDetailsSummarySection
                submission={stateBaseContractOnlySubmission}
            />
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
            screen.getByRole('definition', {
                name: 'Contract amendment effective dates',
            })
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
            <ContractDetailsSummarySection
                submission={stateBaseContractOnlySubmission}
            />
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

    it('displays correct text content for a contract amendment',  () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={draftContractAndRatesSubmission}
            />
        )
        expect(
            screen.getByText('Contract amendment effective dates')
        ).toBeInTheDocument()
        expect(screen.queryByText('Items being amended')).toBeInTheDocument()

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

    it('render supporting contract docs when they exist', async () => {
        const testSubmission = {
            ...draftContractAndRatesSubmission,
            contractDocuments: [
                {
                    s3URL: 's3://foo/bar/contract',
                    name: 'contract test 1',
                    documentCategories: ['CONTRACT' as const],
                },
            ],
            documents: [
                {
                    s3URL: 's3://bucketname/key/test1',
                    name: 'supporting docs test 1',
                    documentCategories: ['CONTRACT_RELATED' as const],
                },
                {
                    s3URL: 's3://bucketname/key/test2',
                    name: 'supporting docs test 2',
                    documentCategories: ['RATES_RELATED' as const],
                },
                {
                    s3URL: 's3://bucketname/key/test3',
                    name: 'supporting docs test 3',
                    documentCategories: [
                        'CONTRACT_RELATED' as const,
                        'RATES_RELATED' as const,
                    ],
                },
            ],
        }
        renderWithProviders(
            <ContractDetailsSummarySection submission={testSubmission} />
        )

  
        const contractDocsTable = screen.getByRole('table', {
            name: 'Contract',
        })
        expect(
          contractDocsTable).toBeInTheDocument()
        
    
        const supportingDocsTable = screen.getByRole('table', {
            name: /Contract supporting documents/,
        })

       
        await waitFor(() => {
            expect(supportingDocsTable).toBeInTheDocument()
            
            // check row content
            expect(
                within(contractDocsTable).getByRole('row', {
                    name: /contract test 1/,
                })
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('supporting docs test 1')
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('*supporting docs test 3')
            ).toBeInTheDocument()

            // check correct category on supporting docs
            expect(
                within(supportingDocsTable).getAllByText(
                    'Contract-supporting'
                ).length
            ).toEqual(2)

        })
    })

    it('does not render supporting contract documents when they do not exist', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={draftContractAndRatesSubmission}
            />
        )

        expect(
            screen.queryByRole('table', {
                name: /Contract supporting documents/,
            })
        ).toBeNull()
    })
})
