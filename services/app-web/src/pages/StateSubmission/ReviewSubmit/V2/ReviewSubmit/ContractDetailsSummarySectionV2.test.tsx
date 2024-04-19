import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ContractDetailsSummarySectionV2 as ContractDetailsSummarySection } from './ContractDetailsSummarySectionV2'
import {
    fetchCurrentUserMock,
    mockContractPackageDraft,
    mockContractPackageSubmitted,
} from '../../../../../testHelpers/apolloMocks'
import { testS3Client } from '../../../../../testHelpers/s3Helpers'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationQuestion,
} from '../../../../../constants/statutoryRegulatoryAttestation'

describe('ContractDetailsSummarySection', () => {
    const defaultApolloMocks = {
        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    }

    it('can render draft submission without errors (review and submit behavior)', async () => {
        const testContract = {
            ...mockContractPackageDraft(),
            documents: [
                {
                    s3URL: 's3://bucketname/key/test1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                },
                {
                    s3URL: 's3://bucketname/key/test3',
                    name: 'supporting docs test 3',
                    sha256: 'fakesha',
                },
            ],
        }

        renderWithProviders(
            <ContractDetailsSummarySection
                contract={testContract}
                editNavigateTo="contract-details"
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
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

    it('can render state submission on summary page without errors (submission summary behavior)', async () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                contract={{
                    ...mockContractPackageSubmitted(),
                    status: 'SUBMITTED',
                }}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
            }
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Contract details',
            })
        ).toBeInTheDocument()
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()

        //expects loading button on component load
        expect(screen.getByText('Loading')).toBeInTheDocument()

        // expects download all button after loading has completed
        await waitFor(() => {
            expect(
                screen.getByRole('link', {
                    name: 'Download all contract documents',
                })
            ).toBeInTheDocument()
        })
    })

    it('can render all contract details fields', async () => {
        const contract = mockContractPackageDraft()

        renderWithProviders(
            <ContractDetailsSummarySection
                contract={contract}
                editNavigateTo="contract-details"
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
                featureFlags: { '438-attestation': true },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('definition', {
                    name: StatutoryRegulatoryAttestationQuestion,
                })
            ).toBeInTheDocument()
        })

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

    it('displays correct contract 438 attestation yes and no text and description', async () => {
        const contract = mockContractPackageDraft()
        if (contract.draftRevision) {
            contract.draftRevision.formData = {
                ...contract.draftRevision.formData,
                statutoryRegulatoryAttestation: false,
                statutoryRegulatoryAttestationDescription: 'No compliance',
            }

            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={contract}
                    editNavigateTo="contract-details"
                    submissionName="MN-PMAP-0001"
                />,
                {
                    apolloProvider: defaultApolloMocks,
                    featureFlags: { '438-attestation': true },
                }
            )
        }
        await waitFor(() => {
            expect(
                screen.getByRole('definition', {
                    name: StatutoryRegulatoryAttestationQuestion,
                })
            ).toBeInTheDocument()
        })

        expect(
            screen.getByRole('definition', {
                name: 'Non-compliance description',
            })
        ).toBeInTheDocument()
        expect(
            await screen.findByText(StatutoryRegulatoryAttestation.NO)
        ).toBeInTheDocument()
        expect(await screen.findByText('No compliance')).toBeInTheDocument()
    })

    it('displays correct effective dates text for base contract', async () => {
        const contract = mockContractPackageDraft()
        if (contract.draftRevision) {
            contract.draftRevision.formData = {
                ...contract.draftRevision.formData,
                contractType: 'BASE',
            }

            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={contract}
                    submissionName="MN-PMAP-0001"
                />,
                {
                    apolloProvider: defaultApolloMocks,
                }
            )
        }

        expect(screen.getByText('Contract effective dates')).toBeInTheDocument()
    })

    it('displays correct effective dates text for contract amendment', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                contract={mockContractPackageDraft()}
                submissionName="MN-PMAP-0001"
                editNavigateTo='/contract-details'
            />,
            {
                apolloProvider: defaultApolloMocks,
            }
        )
        expect(
            screen.getByText('Contract amendment effective dates')
        ).toBeInTheDocument()
    })

    it('render supporting contract docs when they exist', async () => {
        const contract = mockContractPackageDraft()
        if (contract.draftRevision) {
            contract.draftRevision.formData = {
                ...contract.draftRevision.formData,
                contractDocuments: [
                    {
                        s3URL: 's3://foo/bar/contract',
                        name: 'contract test 1',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                ],
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/key/test1',
                        name: 'supporting docs test 1',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                    {
                        s3URL: 's3://bucketname/key/test2',
                        name: 'supporting docs test 2',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                    {
                        s3URL: 's3://bucketname/key/test3',
                        name: 'supporting docs test 3',
                        sha256: 'fakesha',
                        dateAdded: new Date(),
                    },
                ],
            }

            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={contract}
                    submissionName="MN-PMAP-0001"
                    editNavigateTo='/contract-details'
                />,
                {
                    apolloProvider: defaultApolloMocks,
                }
            )
        }

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
                within(supportingDocsTable).getByText('supporting docs test 2')
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('supporting docs test 3')
            ).toBeInTheDocument()

            // check correct category on supporting docs
            expect(
                within(supportingDocsTable).getAllByText('Contract-supporting')
            ).toHaveLength(3)
        })
    })

    it('does not render supporting contract documents table when no documents exist', () => {
        renderWithProviders(
            <ContractDetailsSummarySection
                contract={mockContractPackageDraft()}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
            }
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
                contract={mockContractPackageDraft()}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
            }
        )
        expect(
            screen.queryByRole('button', {
                name: 'Download all contract documents',
            })
        ).toBeNull()
    })

    it('renders federal authorities for a medicaid contract', async () => {
        const contract = mockContractPackageDraft()
        if (contract.draftRevision) {
            contract.draftRevision.formData = {
                ...contract.draftRevision.formData,
                // Add all medicaid federal authorities, as if medicaid contract being unlocked
                federalAuthorities: [
                    'STATE_PLAN',
                    'WAIVER_1915B',
                    'WAIVER_1115',
                    'VOLUNTARY',
                    'BENCHMARK',
                    'TITLE_XXI',
                ],
            }
            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={contract}
                    submissionName="MN-PMAP-0001"
                    editNavigateTo='/contract-details'
                />,
                {
                    apolloProvider: defaultApolloMocks,
                }
            )
        }

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
        const contract = mockContractPackageDraft()
        if (contract.draftRevision) {
            contract.draftRevision.formData = {
                ...contract.draftRevision.formData,
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
            }
            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={contract}
                    submissionName="MN-PMAP-0001"
                    editNavigateTo='/contract-details'
                />,
                {
                    apolloProvider: defaultApolloMocks,
                }
            )
        }

        expect(
            await screen.findByText(
                'Title XXI Separate CHIP State Plan Authority'
            )
        ).toBeInTheDocument()
        expect(
            await screen.findByText('1115 Waiver Authority')
        ).toBeInTheDocument()
        expect(
            screen.queryByText('1932(a) State Plan Authority')
        ).not.toBeInTheDocument()
        expect(
            screen.queryByText('1937 Benchmark Authority')
        ).not.toBeInTheDocument()
    })

    it('renders inline error when bulk URL is unavailable', async () => {
        const s3Provider = {
            ...testS3Client(),
            getBulkDlURL: async (
                _keys: string[],
                _fileName: string
            ): Promise<string | Error> => {
                return new Error('Error: getBulkDlURL encountered an error')
            },
        }
        renderWithProviders(
            <ContractDetailsSummarySection
                contract={{
                    ...mockContractPackageSubmitted(),
                    status: 'SUBMITTED',
                }}
                submissionName="MN-PMAP-0001"
            />,
            {
                apolloProvider: defaultApolloMocks,
                s3Provider,
            }
        )

        await waitFor(() => {
            expect(
                screen.getByText('Contract document download is unavailable')
            ).toBeInTheDocument()
        })
    })

    describe('contract provisions', () => {
        it('renders provisions and MLR references for a medicaid amendment', () => {
            renderWithProviders(
                <ContractDetailsSummarySection
                    contract={mockContractPackageDraft()}
                    submissionName="MN-PMAP-0001"
                />,
                {
                    apolloProvider: defaultApolloMocks,
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
                    'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                )
            ).toBeInTheDocument()

            expect(
                within(modifiedProvisions).getByText(/Risk-sharing strategy/)
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
                within(modifiedProvisions).getByText(
                    'Network adequacy standards'
                )
            ).toBeInTheDocument()
            expect(
                within(modifiedProvisions).getByText(
                    'Enrollment/disenrollment process'
                )
            ).toBeInTheDocument()
            expect(
                within(modifiedProvisions).getByText(
                    /Non-risk payment arrangements/
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

        it('renders provisions and MLR references for a medicaid base contract', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    contractType: 'BASE',
                }
                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

            const modifiedProvisions = screen.getByLabelText(
                'This contract action includes provisions related to the following'
            )
            expect(
                within(modifiedProvisions).getByText(
                    'In Lieu-of Services and Settings (ILOSs) in accordance with 42 CFR § 438.3(e)(2)'
                )
            ).toBeInTheDocument()
            expect(
                within(modifiedProvisions).getByText(
                    'Pass-through payments in accordance with 42 CFR § 438.6(d)'
                )
            ).toBeInTheDocument()

            expect(
                within(modifiedProvisions).getByText(/Risk-sharing strategy/)
            ).toBeInTheDocument()
            expect(
                within(modifiedProvisions).getByText(
                    'State directed payments in accordance with 42 CFR § 438.6(c)'
                )
            ).toBeInTheDocument()

            const unmodifiedProvisions = screen.getByLabelText(
                'This contract action does NOT include provisions related to the following'
            )
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
        })

        it('renders provisions with correct MLR references for CHIP amendment', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    populationCovered: 'CHIP',
                }
                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }
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

        it('shows missing field error when provisions list is empty and section is in edit mode', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    inLieuServicesAndSettings: undefined,
                    modifiedBenefitsProvided: undefined,
                    modifiedGeoAreaServed: undefined,
                    modifiedMedicaidBeneficiaries: undefined,
                    modifiedRiskSharingStrategy: undefined,
                    modifiedIncentiveArrangements: undefined,
                    modifiedWitholdAgreements: undefined,
                    modifiedStateDirectedPayments: undefined,
                    modifiedPassThroughPayments: undefined,
                    modifiedPaymentsForMentalDiseaseInstitutions: undefined,
                    modifiedMedicalLossRatioStandards: undefined,
                    modifiedOtherFinancialPaymentIncentive: undefined,
                    modifiedEnrollmentProcess: undefined,
                    modifiedGrevienceAndAppeal: undefined,
                    modifiedNetworkAdequacyStandards: undefined,
                    modifiedLengthOfContract: undefined,
                    modifiedNonRiskPaymentArrangements: undefined,
                    statutoryRegulatoryAttestation: undefined,
                    statutoryRegulatoryAttestationDescription: undefined,
                }
                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                        editNavigateTo="contract-details"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

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

        it('shows missing field error when provisions list is incomplete and summary section is in edit mode', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    modifiedBenefitsProvided: false,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: false,
                    modifiedLengthOfContract: null,
                    modifiedNonRiskPaymentArrangements: false,
                }

                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                        editNavigateTo="contract-details"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

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

        it('does not show missing field error when provisions list is incomplete and summary section is in view only mode', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    modifiedBenefitsProvided: false,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: false,
                    modifiedLengthOfContract: true,
                    modifiedNonRiskPaymentArrangements: false,
                }

                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

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

        it('does not show missing field error for CHIP amendment when all provisions required are valid', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
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
                }

                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                        editNavigateTo="contract-details"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

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

        it('does not show missing field error for Medicaid amendment when all provisions required are valid', () => {
            const contract = mockContractPackageDraft()
            if (contract.draftRevision) {
                contract.draftRevision.formData = {
                    ...contract.draftRevision.formData,
                    inLieuServicesAndSettings: true,
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
                }

                renderWithProviders(
                    <ContractDetailsSummarySection
                        contract={contract}
                        submissionName="MN-PMAP-0001"
                    />,
                    {
                        apolloProvider: defaultApolloMocks,
                    }
                )
            }

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
})
