import type { ValidationStatusQuery } from '../../../../gen/gqlClient'

type ValidationFinding =
    ValidationStatusQuery['validationStatus']['results'][number]

export interface AIValidationDisplayItem {
    fieldLabel: string
    outcomeLabel: string
    confidenceLabel: string
    message: string
    citations: Array<{
        documentName: string
        pageLabel: string
        orderLabel: string
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

function getOrderLabel(order: number): string {
    return `Chunk order ${order}`
}

export function mapAIValidationFindings(
    findings: ValidationFinding[]
): AIValidationDisplayItem[] {
    return findings.map((finding) => ({
        fieldLabel: getFieldLabel(finding.field),
        outcomeLabel: getOutcomeLabel(finding.outcome),
        confidenceLabel: getConfidenceLabel(finding.confidence),
        message: finding.message,
        citations: finding.citations.map((citation) => ({
            documentName: citation.documentName,
            pageLabel: getPageLabel({
                page: citation.page,
                startPage: citation.startPage,
                endPage: citation.endPage,
            }),
            orderLabel: getOrderLabel(citation.order),
        })),
    }))
}
