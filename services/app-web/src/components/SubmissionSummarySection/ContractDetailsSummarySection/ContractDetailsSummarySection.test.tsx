import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import {
    ContractDetailsSummarySection,
    sortModifiedProvisions,
} from './ContractDetailsSummarySection'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloMocks'
import {
    ModifiedProvisions,
    UnlockedHealthPlanFormDataType,
} from '../../../common-code/healthPlanFormDataType'

describe('ContractDetailsSummarySection', () => {
    it('can render draft submission without errors (review and submit behavior)', () => {
        const testSubmission = {
            ...mockContractAndRatesDraft(),
            documents: [
                {
                    s3URL: 's3://bucketname/key/test1',
                    name: 'supporting docs test 1',
                    documentCategories: ['CONTRACT_RELATED' as const],
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
            <ContractDetailsSummarySection
                submission={testSubmission}
                navigateTo="contract-details"
                submissionName="MN-PMAP-0001"
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
            screen.getByRole('link', {
                name: /Edit Contract supporting documents/,
            })
        ).toHaveAttribute('href', '/documents')
        expect(
            screen.queryByRole('link', {
                name: 'Download all contract documents',
            })
        ).toBeNull()
    })

    it('can render state submission on summary page without errors (submission summary behavior)', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={{
                    ...mockStateSubmission(),
                    status: 'SUBMITTED',
                }}
                submissionName="MN-PMAP-0001"
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
            screen.getByRole('link', {
                name: 'Download all contract documents',
            })
        ).toBeInTheDocument()
    })

    it('can render all contract details fields', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockContractAndRatesDraft()}
                navigateTo="contract-details"
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.getByRole('definition', { name: 'Contract status' })
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
                name: 'Active federal operating authority',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'This contract action includes new or modified provisions related to the following',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'This contract action does NOT include new or modified provisions related to the following',
            })
        ).toBeInTheDocument()
    })

    it('displays correct text content for contract a base contract', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockStateSubmission()}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(screen.getByText('Contract effective dates')).toBeInTheDocument()
        expect(
            screen.queryByText(
                'This contract action does NOT include new or modified provisions related to the following'
            )
        ).not.toBeInTheDocument()
    })

    it('displays correct text content for a contract amendment', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockContractAndRatesDraft()}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.getByText('Contract amendment effective dates')
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'This contract action does NOT include new or modified provisions related to the following'
            )
        ).toBeInTheDocument()
    })

    it('render supporting contract docs when they exist', async () => {
        const testSubmission = {
            ...mockContractAndRatesDraft(),
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
            <ContractDetailsSummarySection
                submission={testSubmission}
                submissionName="MN-PMAP-0001"
            />
        )

        await waitFor(() => {
            const contractDocsTable = screen.getByRole('table', {
                name: 'Contract',
            })

            const supportingDocsTable = screen.getByRole('table', {
                name: /Contract supporting documents/,
            })

            expect(contractDocsTable).toBeInTheDocument()

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
                within(supportingDocsTable).getAllByText('Contract-supporting')
            ).toHaveLength(2)
        })
    })

    it('does not render supporting contract documents table when no documents exist', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockContractAndRatesDraft()}
                submissionName="MN-PMAP-0001"
            />
        )

        expect(
            screen.queryByRole('table', {
                name: /Contract supporting documents/,
            })
        ).toBeNull()
    })

    it('does not render download all button when on previous submission', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockContractAndRatesDraft()}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.queryByRole('button', {
                name: 'Download all contract documents',
            })
        ).toBeNull()
    })

    it('renders amended provisions', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={mockContractAndRatesDraft()}
                submissionName="MN-PMAP-0001"
            />
        )
        expect(
            screen.getByText('Benefits provided by the managed care plans')
        ).toBeInTheDocument()

        const modifiedProvisions = screen.getByLabelText(
            'This contract action includes new or modified provisions related to the following'
        )
        expect(
            within(modifiedProvisions).getByText(
                'Benefits provided by the managed care plans'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'Pass-through payments in accordance with 42 CFR § 438.6(d)'
            )
        ).toBeInTheDocument()

        const unmodifiedProvisions = screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
        expect(
            within(unmodifiedProvisions).getByText(
                'Geographic areas served by the managed care plans'
            )
        ).toBeInTheDocument()
        expect(
            within(unmodifiedProvisions).getByText(
                'Other financial, payment, incentive or related contractual provisions'
            )
        ).toBeInTheDocument()
    })

    it('sorts amended provisions correctly', () => {
        const amendedItems: ModifiedProvisions = {
            modifiedBenefitsProvided: true,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: true,
            modifiedRiskSharingStrategy: true,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: true,
            modifiedPaymentsForMentalDiseaseInstitutions: true,
            modifiedMedicalLossRatioStandards: true,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: true,
            modifiedGrevienceAndAppeal: true,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: false,
            modifiedNonRiskPaymentArrangements: true,
        }

        const [mod, unmod] = sortModifiedProvisions(amendedItems)

        expect(mod).toEqual([
            'modifiedBenefitsProvided',
            'modifiedMedicaidBeneficiaries',
            'modifiedRiskSharingStrategy',
            'modifiedPassThroughPayments',
            'modifiedPaymentsForMentalDiseaseInstitutions',
            'modifiedMedicalLossRatioStandards',
            'modifiedEnrollmentProcess',
            'modifiedGrevienceAndAppeal',
            'modifiedNetworkAdequacyStandards',
            'modifiedNonRiskPaymentArrangements',
        ])
        expect(unmod).toEqual([
            'modifiedGeoAreaServed',
            'modifiedIncentiveArrangements',
            'modifiedWitholdAgreements',
            'modifiedStateDirectedPayments',
            'modifiedOtherFinancialPaymentIncentive',
            'modifiedLengthOfContract',
        ])
    })

    it('shows missing field error on amended provisions when expected', () => {
        const contractWithUnansweredProvisions: UnlockedHealthPlanFormDataType =
            {
                ...mockContractAndRatesDraft(),
                contractAmendmentInfo: {
                    modifiedProvisions: undefined,
                },
            }
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={contractWithUnansweredProvisions}
                submissionName="MN-PMAP-0001"
            />
        )

        const modifiedProvisions = screen.getByLabelText(
            'This contract action includes new or modified provisions related to the following'
        )
        expect(
            within(modifiedProvisions).queryByText(
                /You must provide this information/
            )
        ).toBeInTheDocument()

        const unmodifiedProvisions = screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
        expect(
            within(unmodifiedProvisions).queryByText(
                /You must provide this information/
            )
        ).toBeInTheDocument()
    })
    it('does not show missing field error on amended provisions when expected when valid fields present', () => {
        const contractWithAllUnmodifiedProvisions: UnlockedHealthPlanFormDataType =
            {
                ...mockContractAndRatesDraft(),
                contractAmendmentInfo: {
                    modifiedProvisions: {
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                        modifiedMedicaidBeneficiaries: false,
                        modifiedRiskSharingStrategy: false,
                        modifiedIncentiveArrangements: false,
                        modifiedWitholdAgreements: false,
                        modifiedStateDirectedPayments: false,
                        modifiedPassThroughPayments: false,
                        modifiedPaymentsForMentalDiseaseInstitutions: false,
                        modifiedMedicalLossRatioStandards: false,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: false,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: false,
                        modifiedLengthOfContract: false,
                        modifiedNonRiskPaymentArrangements: false,
                    },
                },
            }
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={contractWithAllUnmodifiedProvisions}
                submissionName="MN-PMAP-0001"
            />
        )

        const modifiedProvisions = screen.getByLabelText(
            'This contract action includes new or modified provisions related to the following'
        )
        expect(
            within(modifiedProvisions).queryByText(
                /You must provide this information/
            )
        ).toBeNull()

        const unmodifiedProvisions = screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
        expect(
            within(unmodifiedProvisions).queryByText(
                /You must provide this information/
            )
        ).toBeNull()
    })
})
