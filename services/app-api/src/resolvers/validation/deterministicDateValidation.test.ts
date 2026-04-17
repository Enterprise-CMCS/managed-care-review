import { describe, expect, it } from 'vitest'
import { runDeterministicDateValidation } from '../../../../ai-form-augmentation/src/validation-output'

describe('runDeterministicDateValidation', () => {
    it('treats equivalent document and form dates as a match when formats differ', () => {
        const result = runDeterministicDateValidation({
            formFields: [
                {
                    field: 'contractStartDate',
                    label: 'Contract Start Date',
                    value: '01/01/2008',
                },
            ],
            retrievedChunks: [
                {
                    chunkId: 'scan.pdf::chunk-0',
                    documentName: 'scan.pdf',
                    page: null,
                    order: 0,
                    text: ['START DATE', 'January 1, 2008'].join('\n'),
                },
            ],
        })

        expect(result.unresolvedFields).toEqual([])
        expect(result.resolvedResults).toEqual([
            {
                field: 'contractStartDate',
                outcome: 'match',
                confidence: 'high',
                message: 'Document text labels start date as 01/01/2008.',
                decisionSource: 'deterministic',
                citations: [
                    {
                        chunkId: 'scan.pdf::chunk-0',
                        documentName: 'scan.pdf',
                        page: null,
                        order: 0,
                    },
                ],
            },
        ])
    })

    it('treats abbreviated month document dates as equivalent to MM/DD/YYYY form values', () => {
        const result = runDeterministicDateValidation({
            formFields: [
                {
                    field: 'contractEndDate',
                    label: 'Contract End Date',
                    value: '12/31/2021',
                },
            ],
            retrievedChunks: [
                {
                    chunkId: 'scan.pdf::chunk-0',
                    documentName: 'scan.pdf',
                    page: null,
                    order: 0,
                    text: ['THROUGH END DATE', 'Dec 31, 2021'].join('\n'),
                },
            ],
        })

        expect(result.unresolvedFields).toEqual([])
        expect(result.resolvedResults).toEqual([
            {
                field: 'contractEndDate',
                outcome: 'match',
                confidence: 'high',
                message: 'Document text labels end date as 12/31/2021.',
                decisionSource: 'deterministic',
                citations: [
                    {
                        chunkId: 'scan.pdf::chunk-0',
                        documentName: 'scan.pdf',
                        page: null,
                        order: 0,
                    },
                ],
            },
        ])
    })

    it('ignores amendment effective date text when validating contract start date', () => {
        const result = runDeterministicDateValidation({
            formFields: [
                {
                    field: 'contractStartDate',
                    label: 'Contract Start Date',
                    value: '01/02/2008',
                },
            ],
            retrievedChunks: [
                {
                    chunkId: 'scan.pdf::chunk-0',
                    documentName: 'scan.pdf',
                    page: null,
                    order: 0,
                    text: [
                        '2. The term of this Agreement is:',
                        'START DATE',
                        'January 1, 2008',
                        'THROUGH END DATE',
                        'December 31,2021',
                        'I. Amendment effective date: January 1, 2021.',
                    ].join('\n'),
                },
            ],
        })

        expect(result.unresolvedFields).toEqual([])
        expect(result.resolvedResults).toEqual([
            {
                field: 'contractStartDate',
                outcome: 'mismatch',
                confidence: 'high',
                message:
                    'Document text labels start date as 01/01/2008, not 01/02/2008.',
                decisionSource: 'deterministic',
                citations: [
                    {
                        chunkId: 'scan.pdf::chunk-0',
                        documentName: 'scan.pdf',
                        page: null,
                        order: 0,
                    },
                ],
            },
        ])
    })
})
