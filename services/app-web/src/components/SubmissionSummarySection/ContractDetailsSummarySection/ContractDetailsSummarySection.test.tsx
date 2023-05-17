import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import {
    ContractDetailsSummarySection,
    sortModifiedProvisions,
} from './ContractDetailsSummarySection'
import {
    fetchCurrentUserMock,
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloMocks'
import {
    ModifiedProvisions,
    UnlockedHealthPlanFormDataType,
} from '@managed-care-review/common-code/healthPlanFormDataType'

describe('ContractDetailsSummarySection', () => {
    it('can render draft submission without errors (review and submit behavior)', async () => {
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
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(
            await screen.findByRole('heading', {
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

    it('renders federal authorities for a medicaid contract', async () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={{
                    ...mockContractAndRatesDraft(),
                    // Add all medicaid federal authorities, as if medicaid contract being unlocked
                    federalAuthorities: [
                        'STATE_PLAN',
                        'WAIVER_1915B',
                        'WAIVER_1115',
                        'VOLUNTARY',
                        'BENCHMARK',
                        'TITLE_XXI',
                    ],
                }}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(
            await screen.findByText(
                'Title XXI Separate CHIP State Plan Authority'
            )
        ).toBeInTheDocument()
        expect(
            await screen.findByText('1115 Waiver Authority')
        ).toBeInTheDocument()
        expect(
            await screen.findByText('1932(a) State Plan Authority')
        ).toBeInTheDocument()
        expect(
            await screen.findByText('1937 Benchmark Authority')
        ).toBeInTheDocument()
    })

    it('renders federal authorities for a CHIP contract as expected, removing invalid authorities', async () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={{
                    ...mockContractAndRatesDraft(),
                    populationCovered: 'CHIP',
                    // Add all medicaid federal authorities, as if medicaid contract being unlocked
                    federalAuthorities: [
                        'STATE_PLAN',
                        'WAIVER_1915B',
                        'WAIVER_1115',
                        'VOLUNTARY',
                        'BENCHMARK',
                        'TITLE_XXI',
                    ],
                }}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(
            await screen.findByText(
                'Title XXI Separate CHIP State Plan Authority'
            )
        ).toBeInTheDocument()
        expect(
            await screen.findByText('1115 Waiver Authority')
        ).toBeInTheDocument()
        expect(
            await screen.queryByText('1932(a) State Plan Authority')
        ).not.toBeInTheDocument()
        expect(
            await screen.queryByText('1937 Benchmark Authority')
        ).not.toBeInTheDocument()
    })

    it('renders amended provisions and MLR references for a medicaid contract correctly', () => {
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

        expect(
            within(modifiedProvisions).getByText(
                'Risk-sharing strategy (e.g., risk corridor, minimum medical loss ratio with a remittance, stop loss limits, reinsurance, etc.in accordance with 42 CFR § 438.6(b)(1)'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'State directed payments in accordance with 42 CFR § 438.6(c)'
            )
        ).toBeInTheDocument()

        expect(
            within(modifiedProvisions).getByText(
                'Medical loss ratio standards in accordance with 42 CFR § 438.8'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText('Network adequacy standards')
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'Enrollment/disenrollment process'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'Non-risk payment arrangements'
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
                'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)'
            )
        ).toBeInTheDocument()
        expect(
            within(unmodifiedProvisions).getByText(
                'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)'
            )
        ).toBeInTheDocument()
        expect(
            within(unmodifiedProvisions).getByText(
                'Grievance and appeal system'
            )
        ).toBeInTheDocument()

        expect(
            within(unmodifiedProvisions).getByText(
                'Length of the contract period'
            )
        ).toBeInTheDocument()

        expect(
            within(unmodifiedProvisions).getByText(
                'Other financial, payment, incentive or related contractual provisions'
            )
        ).toBeInTheDocument()
    })
    it('renders amended provisions with correct MLR references for CHIP contract', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={{
                    ...mockContractAndRatesDraft(),
                    populationCovered: 'CHIP',
                }}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
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
                'Network adequacy standards 42 CFR § 457.1218'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'Enrollment/disenrollment process 42 CFR § 457.1210 and 457.1212'
            )
        ).toBeInTheDocument()
        expect(
            within(modifiedProvisions).getByText(
                'Non-risk payment arrangements 42 CFR 457.10 and 457.1201(c)'
            )
        ).toBeInTheDocument()

        const unmodifiedProvisions = screen.getByLabelText(
            'This contract action does NOT include new or modified provisions related to the following'
        )
        expect(
            within(unmodifiedProvisions).getByText(
                'Grievance and appeal system 42 CFR § 457.1260'
            )
        ).toBeInTheDocument()

        expect(
            within(unmodifiedProvisions).getByText(
                'Grievance and appeal system 42 CFR § 457.1260'
            )
        ).toBeInTheDocument()

        expect(
            within(unmodifiedProvisions).getByText(
                'Length of the contract period'
            )
        ).toBeInTheDocument()

        // not a CHIP provision, even if saved from an unlock, it should not show up on summary page once population is CHIP
        expect(
            within(unmodifiedProvisions).queryByText(
                'Other financial, payment, incentive or related contractual provisions'
            )
        ).toBeNull()
    })

    it('sorts amended provisions correctly for non-CHIP amendment', () => {
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

        const [mod, unmod] = sortModifiedProvisions(amendedItems, false)

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

    it('sorts amended provisions correctly and removes risk provisions from unmodified list for CHIP amendment', () => {
        // removing provisions from modified list is not necessary because we remove that data at the API level on submit.
        // Thi is to ensure we don't improperly display undefined provisions as not assigned when actually they are not applicable for CHIP cases
        const amendedItems: ModifiedProvisions = {
            modifiedBenefitsProvided: true,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: true,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: false,
            modifiedPaymentsForMentalDiseaseInstitutions: false,
            modifiedMedicalLossRatioStandards: true,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: true,
            modifiedGrevienceAndAppeal: true,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: false,
            modifiedNonRiskPaymentArrangements: true,
        }

        const [mod, unmod] = sortModifiedProvisions(amendedItems, true)

        expect(mod).toEqual([
            'modifiedBenefitsProvided',
            'modifiedMedicaidBeneficiaries',
            'modifiedMedicalLossRatioStandards',
            'modifiedEnrollmentProcess',
            'modifiedGrevienceAndAppeal',
            'modifiedNetworkAdequacyStandards',
            'modifiedNonRiskPaymentArrangements',
        ])
        expect(unmod).toEqual([
            'modifiedGeoAreaServed',
            'modifiedLengthOfContract',
        ])
    })

    it('shows missing field error on contract amendment when provisions list is empty', () => {
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
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
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
    it('shows missing field error on contract amendment when provisions list is is incomplete', () => {
        const contractWithUnansweredProvisions: UnlockedHealthPlanFormDataType =
            {
                ...mockContractAndRatesDraft(),
                populationCovered: 'MEDICAID',
                contractAmendmentInfo: {
                    // intentionally putting CHIP population provisions here which is more limited list than is required for Medicaid contrat
                    modifiedProvisions: {
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                        modifiedMedicaidBeneficiaries: true,
                        modifiedMedicalLossRatioStandards: false,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: false,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: false,
                        modifiedLengthOfContract: true,
                        modifiedNonRiskPaymentArrangements: false,
                    },
                },
            }
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={contractWithUnansweredProvisions}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
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

    it('does not show missing field error on contract amendment for CHIP when all provisions required are valid', () => {
        const contractWithAllUnmodifiedProvisions: UnlockedHealthPlanFormDataType =
            {
                ...mockContractAndRatesDraft(),
                populationCovered: 'CHIP',
                contractAmendmentInfo: {
                    modifiedProvisions: {
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                        modifiedMedicaidBeneficiaries: true,
                        modifiedMedicalLossRatioStandards: false,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: false,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: false,
                        modifiedLengthOfContract: true,
                        modifiedNonRiskPaymentArrangements: false,
                    },
                },
            }
        renderWithProviders(
            <ContractDetailsSummarySection
                submission={contractWithAllUnmodifiedProvisions}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
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

    it('does not show missing field error on contract amendment for Medicaid when all provisions required are valid', () => {
        const contractWithAllUnmodifiedProvisions: UnlockedHealthPlanFormDataType =
            {
                ...mockContractAndRatesDraft(),
                populationCovered: 'MEDICAID',
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
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
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
