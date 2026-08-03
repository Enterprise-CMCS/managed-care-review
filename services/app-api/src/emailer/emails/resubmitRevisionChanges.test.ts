import type { ContractType, RevisionDiff } from '../../domain-models'
import { buildResubmitRevisionChanges } from './resubmitRevisionChanges'
import { mockContract, mockMNState } from '../../testHelpers/emailerHelpers'

describe('buildResubmitRevisionChanges', () => {
    const statePrograms = mockMNState().programs
    const currentContract = mockContract()

    it('returns no-diff content when contract field changes are empty', () => {
        const comparison: RevisionDiff = {
            contractID: 'test-contract-id',
            olderRevisionID: 'older-rev',
            newerRevisionID: 'newer-rev',
            olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
            fieldChanges: [],
        }

        expect(
            buildResubmitRevisionChanges(
                currentContract,
                comparison,
                statePrograms
            )
        ).toEqual({
            previousSubmissionDate: '04/30/2027',
            currentSubmissionDate: '05/10/2027',
            hasChanges: false,
            sections: [],
        })
    })

    it('formats submission type field changes for CMS resubmit email', () => {
        const comparison: RevisionDiff = {
            contractID: 'test-contract-id',
            olderRevisionID: 'older-rev',
            newerRevisionID: 'newer-rev',
            olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
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
            previousSubmissionDate: '04/30/2027',
            currentSubmissionDate: '05/10/2027',
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
                        },
                    ],
                },
            ],
        })
    })

    it('formats contract details field changes for CMS resubmit email, including NEW fields', () => {
        const comparison: RevisionDiff = {
            contractID: 'test-contract-id',
            olderRevisionID: 'older-rev',
            newerRevisionID: 'newer-rev',
            olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
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
            previousSubmissionDate: '04/30/2027',
            currentSubmissionDate: '05/10/2027',
            hasChanges: true,
            sections: [
                {
                    title: 'CONTRACT DETAILS',
                    rows: [
                        {
                            label: 'Status',
                            oldValue: 'Unexecuted by some or all parties',
                            newValue: 'Fully executed',
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
            contractID: 'test-contract-id',
            olderRevisionID: 'older-rev',
            newerRevisionID: 'newer-rev',
            olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
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
            previousSubmissionDate: '04/30/2027',
            currentSubmissionDate: '05/10/2027',
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
})
