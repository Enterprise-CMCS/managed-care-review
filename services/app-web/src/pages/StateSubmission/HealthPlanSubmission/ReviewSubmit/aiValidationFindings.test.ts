import { describe, expect, it } from 'vitest'
import type { ValidationStatusQuery } from '../../../../gen/gqlClient'
import { mapAIValidationFindings } from './aiValidationFindings'

type ValidationFinding =
    ValidationStatusQuery['validationStatus']['results'][number]

describe('mapAIValidationFindings', () => {
    it('collapses overlapping page labels for citations from the same document', () => {
        const findings = [
            {
                field: 'contractEndDate',
                outcome: 'mismatch',
                confidence: 'high',
                message:
                    'Document end date (12/31/2025) does not match form end date (04/04/2026).',
                citations: [
                    {
                        chunkId: 'doc::chunk-1',
                        documentName: 'doc.pdf',
                        page: 1,
                        startPage: 1,
                        endPage: 1,
                        order: 1,
                    },
                    {
                        chunkId: 'doc::chunk-2',
                        documentName: 'doc.pdf',
                        page: 1,
                        startPage: 1,
                        endPage: 2,
                        order: 2,
                    },
                ],
            } satisfies ValidationFinding,
        ]

        expect(mapAIValidationFindings(findings)[0].citations).toEqual([
            {
                documentName: 'doc.pdf',
                pageLabels: ['Pages 1-2'],
            },
        ])
    })

    it('preserves distinct page labels when they do not overlap', () => {
        const findings = [
            {
                field: 'contractEndDate',
                outcome: 'mismatch',
                confidence: 'high',
                message:
                    'Document end date (12/31/2025) does not match form end date (04/04/2026).',
                citations: [
                    {
                        chunkId: 'doc::chunk-1',
                        documentName: 'doc.pdf',
                        page: 1,
                        startPage: 1,
                        endPage: 1,
                        order: 1,
                    },
                    {
                        chunkId: 'doc::chunk-2',
                        documentName: 'doc.pdf',
                        page: 3,
                        startPage: 3,
                        endPage: 3,
                        order: 2,
                    },
                ],
            } satisfies ValidationFinding,
        ]

        expect(mapAIValidationFindings(findings)[0].citations).toEqual([
            {
                documentName: 'doc.pdf',
                pageLabels: ['Page 1', 'Page 3'],
            },
        ])
    })
})
