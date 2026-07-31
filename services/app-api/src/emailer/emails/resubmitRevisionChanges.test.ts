import type { RevisionDiff } from '../../domain-models'
import { buildResubmitRevisionChanges } from './resubmitRevisionChanges'
import { mockMNState } from '../../testHelpers/emailerHelpers'

describe('buildResubmitRevisionChanges', () => {
    const statePrograms = mockMNState().programs

    it('returns no-diff content when contract field changes are empty', () => {
        const comparison: RevisionDiff = {
            contractID: 'test-contract-id',
            olderRevisionID: 'older-rev',
            newerRevisionID: 'newer-rev',
            olderSubmittedAt: new Date('2027-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2027-05-11T00:00:00.000Z'),
            fieldChanges: [],
        }

        expect(buildResubmitRevisionChanges(comparison, statePrograms)).toEqual(
            {
                previousSubmissionDate: '04/30/2027',
                currentSubmissionDate: '05/10/2027',
                hasChanges: false,
                sections: [],
            }
        )
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
                {
                    fieldPath: 'contractDateStart',
                    oldValue: new Date('2027-01-01T00:00:00.000Z'),
                    newValue: new Date('2027-05-15T00:00:00.000Z'),
                },
            ],
        }

        expect(
            buildResubmitRevisionChanges(comparison, [
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
})
