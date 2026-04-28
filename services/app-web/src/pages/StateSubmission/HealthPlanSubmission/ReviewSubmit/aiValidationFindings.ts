import type { ValidationStatusQuery } from '../../../../gen/gqlClient'

type ValidationFinding =
    ValidationStatusQuery['validationStatus']['results'][number]

export interface AIValidationDisplayItem {
    fieldLabel: string
    outcome: string
    outcomeLabel: string
    confidence: string
    confidenceLabel: string
    message: string
    comparedValues?: {
        submittedValue: string
        reviewedValue: string
    }
    reasonLabel?: string
    advisoryNote?: string
    citations: Array<{
        documentName: string
        pageLabels: string[]
    }>
}

const FIELD_LABELS: Record<string, string> = {
    contractStartDate: 'Contract start date',
    contractEndDate: 'Contract end date',
    amendmentEffectiveDate: 'Amendment effective date',
}

// Keep the frontend wording advisory even when the stored backend outcome is a
// harder-edged validation label such as "mismatch".
const OUTCOME_LABELS: Record<string, string> = {
    match: 'Matches documents',
    mismatch: 'Needs review',
    'not-enough-evidence': 'Could not verify',
}

const CONFIDENCE_LABELS: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
}

function getFieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field
}

function getOutcomeLabel(outcome: string): string {
    return OUTCOME_LABELS[outcome] ?? outcome
}

function getConfidenceLabel(confidence: string): string {
    return CONFIDENCE_LABELS[confidence] ?? confidence
}

function extractComparedValues(args: {
    outcome: string
    message: string
}): AIValidationDisplayItem['comparedValues'] | undefined {
    if (args.outcome !== 'match' && args.outcome !== 'mismatch') {
        return undefined
    }

    const match = args.message.match(
        /^Document .+? \((.+?)\) (?:does not match|matches) form .+? \((.+?)\)\.$/
    )

    if (!match) {
        return undefined
    }

    return {
        reviewedValue: match[1],
        submittedValue: match[2],
    }
}

function getReasonLabel(outcome: string): string | undefined {
    if (outcome === 'mismatch') {
        return 'Submitted date differs from reviewed document date.'
    }

    return undefined
}

function getAdvisoryNote(outcome: string): string | undefined {
    if (outcome === 'not-enough-evidence') {
        return 'Reviewed documents did not provide enough clear date evidence for this field.'
    }

    return undefined
}

function getPageLabel(args: {
    page: number | null | undefined
    startPage?: number | null
    endPage?: number | null
}): string {
    const { page, startPage, endPage } = args

    if (startPage != null && endPage != null && startPage !== endPage) {
        return `Pages ${startPage}-${endPage}`
    }

    const singlePage = page ?? startPage ?? endPage

    return singlePage == null ? 'Page unknown' : `Page ${singlePage}`
}

function mergeOverlappingPageLabels(args: {
    existingPageLabels: string[]
    nextPageLabel: string
}): string[] {
    const nextRangeMatch = args.nextPageLabel.match(/^Pages (\d+)-(\d+)$/)

    if (!nextRangeMatch) {
        const nextSinglePageMatch = args.nextPageLabel.match(/^Page (\d+)$/)

        if (!nextSinglePageMatch) {
            return args.existingPageLabels.includes(args.nextPageLabel)
                ? args.existingPageLabels
                : [...args.existingPageLabels, args.nextPageLabel]
        }

        const nextPage = Number(nextSinglePageMatch[1])
        const coveredByExistingRange = args.existingPageLabels.some(
            (pageLabel) => {
                const existingRangeMatch = pageLabel.match(/^Pages (\d+)-(\d+)$/)

                if (!existingRangeMatch) {
                    return false
                }

                return (
                    Number(existingRangeMatch[1]) <= nextPage &&
                    Number(existingRangeMatch[2]) >= nextPage
                )
            }
        )

        if (coveredByExistingRange) {
            return args.existingPageLabels
        }

        return args.existingPageLabels.includes(args.nextPageLabel)
            ? args.existingPageLabels
            : [...args.existingPageLabels, args.nextPageLabel]
    }

    if (args.existingPageLabels.includes(args.nextPageLabel)) {
        return args.existingPageLabels
    }

    const rangeStart = Number(nextRangeMatch[1])
    const rangeEnd = Number(nextRangeMatch[2])

    return [
        ...args.existingPageLabels.filter((pageLabel) => {
            const existingSinglePageMatch = pageLabel.match(/^Page (\d+)$/)

            if (!existingSinglePageMatch) {
                return true
            }

            const existingPage = Number(existingSinglePageMatch[1])
            return existingPage < rangeStart || existingPage > rangeEnd
        }),
        args.nextPageLabel,
    ]
}

export function mapAIValidationFindings(
    findings: ValidationFinding[]
): AIValidationDisplayItem[] {
    return findings.map((finding) => ({
        fieldLabel: getFieldLabel(finding.field),
        outcome: finding.outcome,
        outcomeLabel: getOutcomeLabel(finding.outcome),
        confidence: finding.confidence,
        confidenceLabel: getConfidenceLabel(finding.confidence),
        message: finding.message,
        comparedValues: extractComparedValues({
            outcome: finding.outcome,
            message: finding.message,
        }),
        reasonLabel: getReasonLabel(finding.outcome),
        advisoryNote: getAdvisoryNote(finding.outcome),
        citations: Array.from(
            finding.citations.reduce((grouped, citation) => {
                const pageLabel = getPageLabel({
                    page: citation.page,
                    startPage: citation.startPage,
                    endPage: citation.endPage,
                })
                const existing = grouped.get(citation.documentName)

                if (existing) {
                    existing.pageLabels = mergeOverlappingPageLabels({
                        existingPageLabels: existing.pageLabels,
                        nextPageLabel: pageLabel,
                    })
                } else {
                    grouped.set(citation.documentName, {
                        documentName: citation.documentName,
                        pageLabels: [pageLabel],
                    })
                }

                return grouped
            }, new Map<string, { documentName: string; pageLabels: string[] }>())
        ).map(([, citationGroup]) => citationGroup),
    }))
}
