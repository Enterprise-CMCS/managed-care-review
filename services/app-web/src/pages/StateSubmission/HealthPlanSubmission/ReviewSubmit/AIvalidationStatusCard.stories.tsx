import { StoryFn } from '@storybook/react'
import ProvidersDecorator from '../../../../../.storybook/providersDecorator'
import { SectionCard, SectionHeader } from '../../../../components'
import {
    AIValidationStatusDetails,
    AIValidationStatusHeader,
} from './AIvalidationStatusCard'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import {
    AIValidationDisplayState,
    getAIValidationDisplayState,
} from './aiValidationStatus'

const primaryDocumentName = 'synthetic-amendment-baseline.pdf'
const supportingDocumentName = 'synthetic-term-clause-competing-end-dates.pdf'

type ValidationScenario = {
    label: string
    explanation: string
    state: AIValidationDisplayState
    summaryMessage: string
    findings?: AIValidationDisplayItem[]
    expanded?: boolean
    secondaryMessage?: string
}

const mismatchFindings: AIValidationDisplayItem[] = [
    {
        fieldLabel: 'Contract start date',
        outcome: 'mismatch',
        outcomeLabel: 'Needs review',
        confidence: 'high',
        confidenceLabel: 'High',
        message:
            'Document start date (01/01/2024) does not match form start date (04/01/2026).',
        comparedValues: {
            submittedValue: '04/01/2026',
            reviewedValue: '01/01/2024',
        },
        reasonLabel: 'Submitted date differs from reviewed document date.',
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [],
    },
    {
        fieldLabel: 'Contract end date',
        outcome: 'mismatch',
        outcomeLabel: 'Needs review',
        confidence: 'medium',
        confidenceLabel: 'Medium',
        message:
            'Document end date (12/31/2025) does not match form end date (04/04/2026).',
        comparedValues: {
            submittedValue: '04/04/2026',
            reviewedValue: '12/31/2025',
        },
        reasonLabel: 'Submitted date differs from reviewed document date.',
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [
            {
                documentName: supportingDocumentName,
                pageLabels: ['Page 2', 'Page 4'],
            },
        ],
    },
]

const matchFindings: AIValidationDisplayItem[] = [
    {
        fieldLabel: 'Contract start date',
        outcome: 'match',
        outcomeLabel: 'Matches documents',
        confidence: 'high',
        confidenceLabel: 'High',
        message:
            'Document start date (01/01/2024) matches form start date (01/01/2024).',
        comparedValues: {
            submittedValue: '01/01/2024',
            reviewedValue: '01/01/2024',
        },
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [],
    },
    {
        fieldLabel: 'Contract end date',
        outcome: 'match',
        outcomeLabel: 'Matches documents',
        confidence: 'high',
        confidenceLabel: 'High',
        message:
            'Document end date (12/31/2025) matches form end date (12/31/2025).',
        comparedValues: {
            submittedValue: '12/31/2025',
            reviewedValue: '12/31/2025',
        },
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [],
    },
]

const unverifiableFindings: AIValidationDisplayItem[] = [
    {
        fieldLabel: 'Contract start date',
        outcome: 'mismatch',
        outcomeLabel: 'Needs review',
        confidence: 'high',
        confidenceLabel: 'High',
        message:
            'Document start date (01/01/2024) does not match form start date (04/01/2026).',
        comparedValues: {
            submittedValue: '04/01/2026',
            reviewedValue: '01/01/2024',
        },
        reasonLabel: 'Submitted date differs from reviewed document date.',
        primaryCitations: [],
        supportingCitations: [],
    },
    {
        fieldLabel: 'Contract end date',
        outcome: 'not-enough-evidence',
        outcomeLabel: 'Could not verify',
        confidence: 'low',
        confidenceLabel: 'Low',
        message:
            'Could not verify contract end date from the reviewed documents.',
        advisoryNote:
            'Reviewed documents did not provide enough clear date evidence for this field.',
        primaryCitations: [],
        supportingCitations: [],
    },
]

const mixedOutcomeFindings: AIValidationDisplayItem[] = [
    {
        fieldLabel: 'Contract start date',
        outcome: 'match',
        outcomeLabel: 'Matches documents',
        confidence: 'high',
        confidenceLabel: 'High',
        message:
            'Document start date (01/01/2024) matches form start date (01/01/2024).',
        comparedValues: {
            submittedValue: '01/01/2024',
            reviewedValue: '01/01/2024',
        },
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [],
    },
    {
        fieldLabel: 'Contract end date',
        outcome: 'mismatch',
        outcomeLabel: 'Needs review',
        confidence: 'medium',
        confidenceLabel: 'Medium',
        message:
            'Document end date (12/31/2025) does not match form end date (04/04/2026).',
        comparedValues: {
            submittedValue: '04/04/2026',
            reviewedValue: '12/31/2025',
        },
        reasonLabel: 'Submitted date differs from reviewed document date.',
        primaryCitations: [
            {
                documentName: primaryDocumentName,
                pageLabels: ['Page 1'],
            },
        ],
        supportingCitations: [
            {
                documentName: supportingDocumentName,
                pageLabels: ['Page 2', 'Page 4'],
            },
        ],
    },
]

const ScenarioFrame = ({
    label,
    explanation,
    state,
    summaryMessage,
    findings = [],
    expanded = false,
    secondaryMessage,
}: ValidationScenario): React.ReactElement => {
    const hasMismatch = findings.some(
        (finding) => finding.outcome === 'mismatch'
    )
    const showDetails = expanded && hasMismatch

    return (
        <SectionCard style={{ marginBottom: '1.5rem', maxWidth: '52rem' }}>
            <SectionHeader header={label} hideBorderTop />
            <p style={{ margin: '0 0 1rem 0' }}>{explanation}</p>
            <AIValidationStatusHeader
                state={state}
                summaryMessage={summaryMessage}
                secondaryMessage={secondaryMessage}
                showDetailsToggle={hasMismatch}
                findingsExpanded={showDetails}
                onToggleFindings={() => undefined}
            />
            {showDetails && <AIValidationStatusDetails findings={findings} />}
        </SectionCard>
    )
}

export default {
    title: 'Pages/Review Submit/AI Validation',
    component: AIValidationStatusHeader,
    parameters: {
        componentSubtitle:
            'Review & Submit AI validation states shown in the Contract details container.',
    },
}

const ExpandedMismatchTemplate: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'complete' })

    return (
        <ScenarioFrame
            label="Complete with mismatch details expanded"
            explanation="Completed review with current findings. The Review page keeps the high-level summary concise and only exposes detailed evidence when at least one field needs review."
            state={state}
            summaryMessage="A date mismatch was found in the reviewed documents."
            findings={mismatchFindings}
            expanded
        />
    )
}

const IdealResultTemplate: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'complete' })

    return (
        <ScenarioFrame
            label="Ideal result"
            explanation="Completed review with no mismatches. This is the cleanest current PoC outcome: advisory success messaging with no expanded details link."
            state={state}
            summaryMessage="No date mismatches were found in the reviewed documents."
            findings={matchFindings}
        />
    )
}

export const IdealResult = IdealResultTemplate.bind({})
IdealResult.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const ExpandedMismatch = ExpandedMismatchTemplate.bind({})
ExpandedMismatch.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const OneDateMatchesOneNeedsReview: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'complete' })

    return (
        <ScenarioFrame
            label="One date matches and one needs review"
            explanation="Completed review with mixed outcomes. The current PoC still uses the concise mismatch summary because at least one field needs review, and the expanded details show both the matching and mismatching date findings together."
            state={state}
            summaryMessage="A date mismatch was found in the reviewed documents."
            findings={mixedOutcomeFindings}
            expanded
        />
    )
}
OneDateMatchesOneNeedsReview.decorators = [
    (StoryFn) => ProvidersDecorator(StoryFn, {}),
]

export const Pending: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'not-started' })

    return (
        <ScenarioFrame
            label="Pending"
            explanation="No validation artifact exists yet for the current contract snapshot. The page shows a non-blocking pending state and can still trigger review in the background."
            state={state}
            summaryMessage={state.message}
        />
    )
}
Pending.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const LoadingLatestResults: StoryFn = () => {
    const state: AIValidationDisplayState = {
        title: 'Loading document review',
        message: 'Loading the latest document review results.',
        alertType: 'info',
        isPolling: true,
    }

    return (
        <ScenarioFrame
            label="Loading latest results"
            explanation="The Review page has not finished loading the latest validation artifact yet. This is the short-lived initial loading state used before the current status/result snapshot is known."
            state={state}
            summaryMessage={state.message}
        />
    )
}
LoadingLatestResults.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const PreparingDocuments: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'parsing' })

    return (
        <ScenarioFrame
            label="Preparing documents"
            explanation="The worker is still parsing, OCRing, or indexing the uploaded PDFs. This is the earliest in-progress state before evidence comparison begins."
            state={state}
            summaryMessage={state.message}
        />
    )
}
PreparingDocuments.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const ReviewingDocuments: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'retrieving' })

    return (
        <ScenarioFrame
            label="Reviewing documents"
            explanation="The worker has enough parsed/indexed content to compare submission dates against document evidence. This is also the stage reused for gated fallback expansion after first-pass parsing already completed."
            state={state}
            summaryMessage={state.message}
        />
    )
}
ReviewingDocuments.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const ValidatingDates: StoryFn = () => {
    const state = getAIValidationDisplayState({
        stage: 'deterministic-validation',
    })

    return (
        <ScenarioFrame
            label="Validating dates"
            explanation="The worker is in the actual date-comparison phase. The current PoC uses the same user-facing in-progress treatment for deterministic and LLM-backed validation stages."
            state={state}
            summaryMessage={state.message}
        />
    )
}
ValidatingDates.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Refreshing: StoryFn = () => {
    const state = getAIValidationDisplayState({
        stage: 'retrieving',
        isStale: true,
    })

    return (
        <ScenarioFrame
            label="Refreshing after changes"
            explanation="A previous result exists, but the current contract dates or uploaded documents changed. The PoC keeps showing a refresh state instead of stale findings until the new artifact catches up."
            state={state}
            summaryMessage={state.message}
        />
    )
}
Refreshing.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const TimedOut: StoryFn = () => {
    const state = getAIValidationDisplayState({ hasTimedOut: true })

    return (
        <ScenarioFrame
            label="Still running after timeout"
            explanation="The page stopped presenting a spinner-only experience after the polling window expired, but the backend review may still finish later. This stays advisory and non-blocking."
            state={state}
            summaryMessage={state.message}
        />
    )
}
TimedOut.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const LimitedCoverage: StoryFn = () => {
    const state = getAIValidationDisplayState({
        stage: 'complete',
        isPartialCoverage: true,
    })

    return (
        <ScenarioFrame
            label="Complete with limited coverage"
            explanation="The review completed, but not every eligible uploaded document was fully usable. The current PoC keeps the result advisory and surfaces the reduced coverage through status messaging."
            state={state}
            summaryMessage="No date mismatches were found in the reviewed documents."
            secondaryMessage="Some uploaded documents could not be fully reviewed."
            findings={matchFindings}
        />
    )
}
LimitedCoverage.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const LimitedCoverageWithMismatch: StoryFn = () => {
    const state = getAIValidationDisplayState({
        stage: 'complete',
        isPartialCoverage: true,
    })

    return (
        <ScenarioFrame
            label="Complete with limited coverage and mismatch"
            explanation="The review completed with reduced document coverage and still found a date that needs review. The current PoC keeps the limited-coverage status messaging while still exposing mismatch details when at least one field needs review."
            state={state}
            summaryMessage="A date mismatch was found in the reviewed documents."
            secondaryMessage="Some uploaded documents could not be fully reviewed."
            findings={mismatchFindings}
            expanded
        />
    )
}
LimitedCoverageWithMismatch.decorators = [
    (StoryFn) => ProvidersDecorator(StoryFn, {}),
]

export const UnverifiableField: StoryFn = () => {
    const state = getAIValidationDisplayState({ stage: 'complete' })

    return (
        <ScenarioFrame
            label="Complete with unverifiable field"
            explanation="Completed review with mixed outcomes. One field needs review and another could not be verified from the reviewed evidence, which is the current PoC path for incomplete document support."
            state={state}
            summaryMessage="A date mismatch was found in the reviewed documents."
            findings={unverifiableFindings}
            expanded
        />
    )
}
UnverifiableField.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Unavailable: StoryFn = () => {
    const state = getAIValidationDisplayState({
        stage: 'failed',
        error: 'We could not load document review results right now. You can continue reviewing and submit without these results.',
    })

    return (
        <ScenarioFrame
            label="Unavailable"
            explanation="The current artifact could not be loaded or the review failed. The PoC intentionally keeps this non-blocking and does not prevent submission."
            state={state}
            summaryMessage={state.message}
        />
    )
}
Unavailable.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
