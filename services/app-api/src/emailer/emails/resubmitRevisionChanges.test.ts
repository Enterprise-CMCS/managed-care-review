import type { ContractType, RevisionDiff } from '../../domain-models'
import { buildResubmitRevisionChanges } from './resubmitRevisionChanges'
import { mockContract, mockMNState } from '../../testHelpers/emailerHelpers'
import { ActuaryCommunicationRecord } from '@mc-review/submissions'

describe('buildResubmitRevisionChanges', () => {
    const statePrograms = mockMNState().programs
    const currentContract = mockContract()

    // The resubmit email renders multiple diff collections, so the remaining
    // ones are required by the type even when a test only exercises one area.
    const baseComparison: Omit<RevisionDiff, 'fieldChanges'> = {
        contractID: 'test-contract-id',
        olderRevisionID: 'older-rev',
        newerRevisionID: 'newer-rev',
        olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
        newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
        stateContactChanges: [],
        documentChanges: {
            contractDocuments: { added: [], removed: [] },
            contractSupportingDocuments: { added: [], removed: [] },
            ratesDocuments: [],
            totalAdded: 0,
            totalRemoved: 0,
        },
        rateChanges: { added: [], removed: [], revised: [] },
    }
    const baseDates = {
        previousSubmissionDate: '04/30/2027',
        currentSubmissionDate: '05/10/2027',
    }

    it('returns no-diff content when contract field changes are empty', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: false,
            sections: [],
        })
    })

    it('formats submission type field changes for CMS resubmit email', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'contractName',
                    oldValue: 'MCR-IL-0005-CHIP-PCCME',
                    newValue: 'MCR-IL-0005-CHIP-CCCPLUS-FIDESNP-PCCME',
                },
                {
                    fieldPath: 'populationCovered',
                    oldValue: 'MEDICAID',
                    newValue: 'MEDICAID_AND_CHIP',
                },
                {
                    fieldPath: 'submissionType',
                    oldValue: 'CONTRACT_ONLY',
                    newValue: 'CONTRACT_AND_RATES',
                },
                {
                    fieldPath: 'contractType',
                    oldValue: 'BASE',
                    newValue: 'AMENDMENT',
                },
                {
                    fieldPath: 'riskBasedContract',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'programIDs',
                    oldValue: [
                        'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        'd95394e5-44d1-45df-8151-1cc1ee66f100',
                    ],
                    newValue: [
                        '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                        'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        'd95394e5-44d1-45df-8151-1cc1ee66f100',
                        'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    ],
                },
                {
                    fieldPath: 'submissionDescription',
                    oldValue: 'Original submission description',
                    newValue: 'Updated submission description',
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(currentContract, comparison, [
                ...statePrograms,
                {
                    id: '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                    name: 'CHIP',
                    fullName: 'CHIP',
                    isRateProgram: false,
                    isDeprecated: false,
                },
            ])
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'SUBMISSION TYPE',
                    rows: [
                        {
                            label: 'Submission ID',
                            oldValue: 'MCR-IL-0005-CHIP-PCCME',
                            newValue: 'MCR-IL-0005-CHIP-CCCPLUS-FIDESNP-PCCME',
                        },
                        {
                            label: 'Medicaid populations',
                            oldValue: 'Medicaid',
                            newValue: 'Medicaid and CHIP',
                        },
                        {
                            label: 'Submission type',
                            oldValue: 'Contract only',
                            newValue: 'Contract and rate(s)',
                        },
                        {
                            label: 'Contract action type',
                            oldValue: 'Base',
                            newValue: 'Amendment',
                        },
                        {
                            label: 'Risk-based contract',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Programs',
                            oldValue: 'SNBC, PMAP',
                            newValue: 'CHIP, SNBC, PMAP, MSC+',
                        },
                        {
                            label: 'Submission description',
                            oldValue: 'Original submission description',
                            newValue: 'Updated submission description',
                            breakBeforeNewValue: true,
                        },
                    ],
                },
            ],
        })
    })

    it('formats contract details field changes for CMS resubmit email, including NEW fields', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'contractExecutionStatus',
                    oldValue: 'UNEXECUTED',
                    newValue: 'EXECUTED',
                },
                {
                    fieldPath: 'contractDateStart',
                    oldValue: new Date('2027-01-01T00:00:00.000Z'),
                    newValue: new Date('2027-05-15T00:00:00.000Z'),
                },
                {
                    fieldPath: 'contractDateEnd',
                    oldValue: new Date('2028-01-01T00:00:00.000Z'),
                    newValue: new Date('2028-05-15T00:00:00.000Z'),
                },
                {
                    fieldPath: 'managedCareEntities',
                    oldValue: ['MCO'],
                    newValue: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                },
                {
                    fieldPath: 'federalAuthorities',
                    oldValue: ['TITLE_XXI'],
                    newValue: ['STATE_PLAN', 'WAIVER_1115', 'TITLE_XXI'],
                },
                {
                    fieldPath: 'dsnpContract',
                    oldValue: undefined,
                    newValue: true,
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'CONTRACT DETAILS',
                    rows: [
                        {
                            label: 'Status',
                            oldValue: 'Unexecuted',
                            newValue: 'Executed',
                        },
                        {
                            label: 'Start date',
                            oldValue: '01/01/2027',
                            newValue: '05/15/2027',
                        },
                        {
                            label: 'End date',
                            oldValue: '01/01/2028',
                            newValue: '05/15/2028',
                        },
                        {
                            label: 'Managed Care entities',
                            oldValue: 'MCO',
                            newValue: 'MCO, PIHP, PAHP, PCCM',
                        },
                        {
                            label: 'Managed Care authorities',
                            oldValue:
                                'Title XXI Separate CHIP State Plan Authority',
                            newValue:
                                '1932(a) State Plan Authority, 1115 Waiver Authority, Title XXI Separate CHIP State Plan Authority',
                            breakBeforeNewValue: true,
                        },
                        {
                            label: 'Associated with a D-SNP',
                            newValue: 'Yes',
                            isNew: true,
                        },
                    ],
                },
            ],
        })
    })

    it('formats removed contract detail values with a dash placeholder', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'dsnpContract',
                    oldValue: false,
                    newValue: undefined,
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'CONTRACT DETAILS',
                    rows: [
                        {
                            label: 'Associated with a D-SNP',
                            oldValue: 'No',
                            newValue: '⎯',
                        },
                    ],
                },
            ],
        })
    })

    it('formats contract provisions field changes for CMS resubmit email, including NEW fields', () => {
        const baseContract = mockContract()
        const chipContract: ContractType = {
            ...baseContract,
            packageSubmissions: [
                {
                    ...baseContract.packageSubmissions[0],
                    contractRevision: {
                        ...baseContract.packageSubmissions[0].contractRevision,
                        formData: {
                            ...baseContract.packageSubmissions[0]
                                .contractRevision.formData,
                            populationCovered: 'CHIP',
                            contractType: 'AMENDMENT',
                        },
                    },
                },
            ],
        }
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'inLieuServicesAndSettings',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedBenefitsProvided',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedGeoAreaServed',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedMedicaidBeneficiaries',
                    oldValue: undefined,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedRiskSharingStrategy',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedIncentiveArrangements',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedWitholdAgreements',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedStateDirectedPayments',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedPassThroughPayments',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedMedicalLossRatioStandards',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedOtherFinancialPaymentIncentive',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedGrevienceAndAppeal',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedNetworkAdequacyStandards',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedLengthOfContract',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedNonRiskPaymentArrangements',
                    oldValue: false,
                    newValue: true,
                },
                {
                    fieldPath: 'modifiedPaymentsForMentalDiseaseInstitutions',
                    oldValue: false,
                    newValue: true,
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(
                chipContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'CONTRACT PROVISIONS',
                    rows: [
                        {
                            label: 'In Lieu-of Services and Settings',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Benefits provided',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Geo area served',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'CHIP beneficiaries',
                            newValue: 'Yes',
                            isNew: true,
                        },
                        {
                            label: 'Risk-sharing strategy',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Incentive arrangements',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Withhold arrangements',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'State directed payments',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Pass-through payments',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Medical loss ratio standards',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Other financial payment',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Grievance and appeal',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Network adequacy standards',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Length of the contract',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Non-risk payment arrangements',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                        {
                            label: 'Payments for mental disease institutions',
                            oldValue: 'No',
                            newValue: 'Yes',
                        },
                    ],
                },
            ],
        })
    })

    it('formats removed contract provision values with a dash placeholder', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'modifiedBenefitsProvided',
                    oldValue: false,
                    newValue: undefined,
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'CONTRACT PROVISIONS',
                    rows: [
                        {
                            label: 'Benefits provided',
                            oldValue: 'No',
                            newValue: '⎯',
                        },
                    ],
                },
            ],
        })
    })

    it('formats new and modified state contacts for CMS resubmit email', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            stateContactChanges: [
                {
                    changeType: 'NEW_OR_MODIFIED',
                    current: {
                        name: 'Kasimir Kraft',
                        titleRole: 'Assistant Division Chief',
                        email: 'kkraft@il.gov',
                    },
                },
                {
                    changeType: 'NEW_OR_MODIFIED',
                    current: {
                        name: 'Rhonda Cumberbatch',
                        titleRole: 'ASA PRINCIPLE',
                        email: 'Rhonda@il.gov',
                    },
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'STATE CONTACTS',
                    contactsLabel: 'New and modified:',
                    contacts: [
                        {
                            value: 'Kasimir Kraft, Assistant Division Chief, kkraft@il.gov',
                        },
                        {
                            value: 'Rhonda Cumberbatch, ASA PRINCIPLE, Rhonda@il.gov',
                        },
                    ],
                },
            ],
        })
    })

    it('formats contract and rate document changes for CMS resubmit email', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            documentChanges: {
                contractDocuments: {
                    added: ['Contract Amendment 08.pdf'],
                    removed: ['Prior Contract Amendment 08.pdf'],
                },
                contractSupportingDocuments: {
                    added: [],
                    removed: ['Supporting Rate Cert.pdf'],
                },
                ratesDocuments: [
                    {
                        rateID: 'rate-1',
                        rateCertificationName:
                            'MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20251230',
                        rateDocuments: {
                            added: [
                                'IL FIDE SNP CY 28 RATE CERTIFICATION.xlsx',
                            ],
                            removed: ['Old Rate Cert Summary.pdf'],
                        },
                        supportingDocuments: {
                            added: [],
                            removed: ['Old Supporting Rate Doc.pdf'],
                        },
                    },
                ],
                totalAdded: 2,
                totalRemoved: 4,
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'DOCUMENTS',
                    documentSummary: {
                        totalChanged: 6,
                        totalAdded: 2,
                        totalRemoved: 4,
                    },
                    documentGroups: [
                        {
                            title: 'CONTRACT',
                            rows: [
                                {
                                    label: 'Added',
                                    value: 'Contract Amendment 08.pdf',
                                },
                                {
                                    label: 'Removed',
                                    value: 'Prior Contract Amendment 08.pdf',
                                },
                            ],
                        },
                        {
                            title: 'CONTRACT SUPPORTING',
                            rows: [
                                {
                                    label: 'Removed',
                                    value: 'Supporting Rate Cert.pdf',
                                },
                            ],
                        },
                        {
                            title: 'RATE CERTIFICATION | MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20251230',
                            rows: [
                                {
                                    label: 'Added',
                                    value: 'IL FIDE SNP CY 28 RATE CERTIFICATION.xlsx',
                                },
                                {
                                    label: 'Removed',
                                    value: 'Old Rate Cert Summary.pdf',
                                },
                            ],
                        },
                        {
                            title: 'RATE SUPPORTING | MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20251230',
                            rows: [
                                {
                                    label: 'Removed',
                                    value: 'Old Supporting Rate Doc.pdf',
                                },
                            ],
                        },
                    ],
                },
            ],
        })
    })

    it('omits empty document groups from the documents section', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            documentChanges: {
                contractDocuments: {
                    added: [],
                    removed: [],
                },
                contractSupportingDocuments: {
                    added: [],
                    removed: ['supporting-only.pdf'],
                },
                ratesDocuments: [
                    {
                        rateID: 'rate-1',
                        rateCertificationName: 'RATE-ONE',
                        rateDocuments: {
                            added: [],
                            removed: [],
                        },
                        supportingDocuments: {
                            added: ['rate-support-added.pdf'],
                            removed: [],
                        },
                    },
                ],
                totalAdded: 1,
                totalRemoved: 1,
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'DOCUMENTS',
                    documentSummary: {
                        totalChanged: 2,
                        totalAdded: 1,
                        totalRemoved: 1,
                    },
                    documentGroups: [
                        {
                            title: 'CONTRACT SUPPORTING',
                            rows: [
                                {
                                    label: 'Removed',
                                    value: 'supporting-only.pdf',
                                },
                            ],
                        },
                        {
                            title: 'RATE SUPPORTING | RATE-ONE',
                            rows: [
                                {
                                    label: 'Added',
                                    value: 'rate-support-added.pdf',
                                },
                            ],
                        },
                    ],
                },
            ],
        })
    })

    it('uses the UI fallback label when a rate document group has no rate name', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            documentChanges: {
                contractDocuments: {
                    added: [],
                    removed: [],
                },
                contractSupportingDocuments: {
                    added: [],
                    removed: [],
                },
                ratesDocuments: [
                    {
                        rateID: 'rate-without-name',
                        rateCertificationName: undefined,
                        rateDocuments: {
                            added: ['rate-cert-added.pdf'],
                            removed: [],
                        },
                        supportingDocuments: {
                            added: [],
                            removed: ['rate-support-removed.pdf'],
                        },
                    },
                ],
                totalAdded: 1,
                totalRemoved: 1,
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'DOCUMENTS',
                    documentSummary: {
                        totalChanged: 2,
                        totalAdded: 1,
                        totalRemoved: 1,
                    },
                    documentGroups: [
                        {
                            title: 'RATE CERTIFICATION | Unknown rate name',
                            rows: [
                                {
                                    label: 'Added',
                                    value: 'rate-cert-added.pdf',
                                },
                            ],
                        },
                        {
                            title: 'RATE SUPPORTING | Unknown rate name',
                            rows: [
                                {
                                    label: 'Removed',
                                    value: 'rate-support-removed.pdf',
                                },
                            ],
                        },
                    ],
                },
            ],
        })
    })

    it('formats added, removed, and revised rates for CMS resubmit email', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            rateChanges: {
                added: [
                    {
                        rateID: 'added-rate-id',
                        rateCertificationName:
                            'MCR-FL-NEMT-20260501-20260531-CERTIFICATION-20260507',
                        isLinkedRate: true,
                    },
                ],
                removed: [
                    {
                        rateID: 'removed-rate-id',
                        rateCertificationName:
                            'MCR-FL-NEMTMTM-20260501-20260531-CERTIFICATION-20260507',
                    },
                ],
                revised: [
                    {
                        rateID: 'revised-rate-id',
                        rateCertificationName:
                            'MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20260707',
                        fieldChanges: [
                            {
                                fieldPath: 'rateCapitationType',
                                oldValue: 'RATE_CELL',
                                newValue: 'RATE_RANGE',
                            },
                            {
                                fieldPath: 'rateCertificationName',
                                oldValue:
                                    'MCR-IL-PCCME-01012027-07082027-AMENDMENT-07042026',
                                newValue:
                                    'MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20260707',
                            },
                            {
                                fieldPath: 'rateProgramIDs',
                                oldValue: [
                                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                                ],
                                newValue: [
                                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                                ],
                            },
                            {
                                fieldPath: 'rateType',
                                oldValue: 'AMENDMENT',
                                newValue: 'NEW',
                            },
                            {
                                fieldPath: 'rateDateCertified',
                                oldValue: new Date('2026-07-04T00:00:00.000Z'),
                                newValue: new Date('2026-07-21T00:00:00.000Z'),
                            },
                            {
                                fieldPath: 'actuaryCommunicationPreference',
                                oldValue: 'OACT_TO_ACTUARY',
                                newValue: 'OACT_TO_STATE',
                            },
                        ],
                        rateDocuments: { added: [], removed: [] },
                        supportingRateDocuments: { added: [], removed: [] },
                        certifyingActuaryContactChanges: [
                            {
                                changeType: 'NEW_OR_MODIFIED',
                                current: {
                                    name: 'Jalen Brunson',
                                    titleRole: 'Head of Risk Development',
                                    email: 'jalen.brunson@ow.com',
                                    actuarialFirm: 'OTHER',
                                    actuarialFirmOther: 'Olivier Wyman',
                                },
                            },
                        ],
                        addtlActuaryContactChanges: [
                            {
                                changeType: 'NEW_OR_MODIFIED',
                                current: {
                                    name: 'Bill Yard',
                                    titleRole: 'Executive assistant',
                                    email: 'byard@mercer.com',
                                    actuarialFirm: 'MERCER',
                                },
                            },
                        ],
                    },
                ],
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            ...baseDates,
            hasChanges: true,
            sections: [
                {
                    title: 'RATE DETAILS',
                    rateGroups: [
                        {
                            title: 'Added MCR-FL-NEMT-20260501-20260531-CERTIFICATION-20260507',
                            rows: [
                                {
                                    label: 'Rate included with another submission',
                                    newValue: 'Yes',
                                },
                            ],
                        },
                        {
                            title: 'Removed MCR-FL-NEMTMTM-20260501-20260531-CERTIFICATION-20260507',
                        },
                        {
                            title: 'Revised MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20260707',
                            rows: [
                                {
                                    label: 'Rate name',
                                    oldValue:
                                        'MCR-IL-PCCME-01012027-07082027-AMENDMENT-07042026',
                                    newValue:
                                        'MCR-IL-FIDESNP-20260101-20261231-CERTIFICATION-20260707',
                                    breakBeforeNewValue: true,
                                },
                                {
                                    label: 'Rate programs',
                                    oldValue: 'SNBC',
                                    newValue: 'PMAP',
                                },
                                {
                                    label: 'Type',
                                    oldValue: 'Amendment',
                                    newValue: 'New',
                                },
                                {
                                    label: 'Date certified',
                                    oldValue: '07/04/2026',
                                    newValue: '07/21/2026',
                                },
                                {
                                    label: 'Rate capitation type',
                                    oldValue: 'Cell',
                                    newValue: 'Range',
                                },
                                {
                                    label: 'Actuaries’ communication preference',
                                    oldValue:
                                        ActuaryCommunicationRecord.OACT_TO_ACTUARY,
                                    newValue:
                                        ActuaryCommunicationRecord.OACT_TO_STATE,
                                    breakBeforeNewValue: true,
                                },
                            ],
                            contactsLabel: 'New and modified actuaries:',
                            contacts: [
                                {
                                    value: 'Jalen Brunson, Head of Risk Development, Olivier Wyman, jalen.brunson@ow.com',
                                },
                                {
                                    value: 'Bill Yard, Executive assistant, Mercer, byard@mercer.com',
                                },
                            ],
                        },
                    ],
                },
            ],
        })
    })

    it('marks rate fields absent from the prior revision as new and removed rate fields with a dash placeholder', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            rateChanges: {
                added: [],
                removed: [],
                revised: [
                    {
                        rateID: 'revised-rate-id',
                        rateCertificationName: 'RATE-ONE',
                        fieldChanges: [
                            {
                                fieldPath: 'rateMedicaidPopulations',
                                oldValue: [],
                                newValue: [
                                    'MEDICAID_ONLY',
                                    'MEDICARE_MEDICAID_WITH_DSNP',
                                    'MEDICARE_MEDICAID_WITHOUT_DSNP',
                                ],
                            },
                            {
                                fieldPath: 'amendmentEffectiveDateStart',
                                oldValue: undefined,
                                newValue: new Date('2027-07-08T00:00:00.000Z'),
                            },
                            {
                                fieldPath: 'rateDateEnd',
                                oldValue: new Date('2028-01-01T00:00:00.000Z'),
                                newValue: undefined,
                            },
                        ],
                        rateDocuments: { added: [], removed: [] },
                        supportingRateDocuments: { added: [], removed: [] },
                        certifyingActuaryContactChanges: [],
                        addtlActuaryContactChanges: [],
                    },
                ],
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            ).sections
        ).toEqual([
            {
                title: 'RATE DETAILS',
                rateGroups: [
                    {
                        title: 'Revised RATE-ONE',
                        rows: [
                            {
                                label: 'Rate start',
                                newValue: '07/08/2027',
                                isNew: true,
                            },
                            {
                                label: 'Original rating end',
                                oldValue: '01/01/2028',
                                newValue: '⎯',
                            },
                            {
                                label: 'Medicaid populations included',
                                newValue:
                                    'Medicaid-only, Dually eligible individuals enrolled through a D-SNP, Dually eligible individuals not enrolled through a D-SNP',
                                isNew: true,
                            },
                        ],
                    },
                ],
            },
        ])
    })

    it('omits a revised rate whose only changes are documents', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            rateChanges: {
                added: [],
                removed: [],
                revised: [
                    {
                        rateID: 'revised-rate-id',
                        rateCertificationName: 'RATE-ONE',
                        fieldChanges: [],
                        rateDocuments: {
                            added: ['new-rate-cert.pdf'],
                            removed: [],
                        },
                        supportingRateDocuments: { added: [], removed: [] },
                        certifyingActuaryContactChanges: [],
                        addtlActuaryContactChanges: [],
                    },
                ],
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            ).sections
        ).toEqual([])
    })

    it('uses the fallback rate name when a changed rate has no rate name', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [],
            rateChanges: {
                added: [],
                removed: [{ rateID: 'removed-rate-id' }],
                revised: [],
            },
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            ).sections
        ).toEqual([
            {
                title: 'RATE DETAILS',
                rateGroups: [{ title: 'Removed Unknown rate name' }],
            },
        ])
    })

    it('orders formatter sections in the expected email sequence', () => {
        const comparison: RevisionDiff = {
            ...baseComparison,
            fieldChanges: [
                {
                    fieldPath: 'submissionType',
                    oldValue: 'CONTRACT_ONLY',
                    newValue: 'CONTRACT_AND_RATES',
                },
                {
                    fieldPath: 'contractExecutionStatus',
                    oldValue: 'UNEXECUTED',
                    newValue: 'EXECUTED',
                },
                {
                    fieldPath: 'modifiedBenefitsProvided',
                    oldValue: false,
                    newValue: true,
                },
            ],
            stateContactChanges: [
                {
                    changeType: 'NEW_OR_MODIFIED',
                    current: {
                        name: 'Kasimir Kraft',
                        titleRole: 'Assistant Division Chief',
                        email: 'kkraft@il.gov',
                    },
                },
            ],
            documentChanges: {
                contractDocuments: {
                    added: ['Contract Amendment 08.pdf'],
                    removed: [],
                },
                contractSupportingDocuments: {
                    added: [],
                    removed: [],
                },
                ratesDocuments: [],
                totalAdded: 1,
                totalRemoved: 0,
            },
            rateChanges: {
                added: [],
                removed: [
                    {
                        rateID: 'removed-rate-id',
                        rateCertificationName: 'RATE-ONE',
                    },
                ],
                revised: [],
            },
        }

        const result = buildResubmitRevisionChanges(
            currentContract,
            comparison,
            statePrograms
        )

        expect(result.sections.map((section) => section.title)).toEqual([
            'SUBMISSION TYPE',
            'CONTRACT DETAILS',
            'CONTRACT PROVISIONS',
            'RATE DETAILS',
            'STATE CONTACTS',
            'DOCUMENTS',
        ])
    })
})
