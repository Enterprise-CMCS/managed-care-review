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

type ValidationScenario = {
    label: string
    state: AIValidationDisplayState
    summaryMessage: string
    findings?: AIValidationDisplayItem[]
    expanded?: boolean
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
        citations: [
            {
                documentName: 'AAH 23-30212 A03 213A Final.pdf',
                pageLabels: ['Page 1'],
            },
        ],
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
        citations: [
            {
                documentName: 'AAH 23-30212 A03 213A Final.pdf',
                pageLabels: ['Page 1'],
            },
            {
                documentName: 'CCAH 23-30241 A03 213A Final.pdf',
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
        citations: [
            {
                documentName: 'AAH 23-30212 A03 213A Final.pdf',
                pageLabels: ['Page 1'],
            },
        ],
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
        citations: [
            {
                documentName: 'AAH 23-30212 A03 213A Final.pdf',
                pageLabels: ['Page 1'],
            },
        ],
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
        citations: [],
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
        citations: [],
    },
]

const ScenarioFrame = ({
    label,
    state,
    summaryMessage,
    findings = [],
    expanded = false,
}: ValidationScenario): React.ReactElement => {
    const hasMismatch = findings.some(
        (finding) => finding.outcome === 'mismatch'
    )
    const showDetails = expanded && hasMismatch

    return (
        <SectionCard style={{ marginBottom: '1.5rem', maxWidth: '52rem' }}>
            <SectionHeader header={`Contract details: ${label}`} hideBorderTop />
            <AIValidationStatusHeader
                state={state}
                summaryMessage={summaryMessage}
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

const ExpandedMismatchTemplate: StoryFn = () => (
    <ScenarioFrame
        label="Complete with mismatch details expanded"
        state={getAIValidationDisplayState({ stage: 'complete' })}
        summaryMessage="A date mismatch was found in the reviewed documents."
        findings={mismatchFindings}
        expanded
    />
)

const IdealResultTemplate: StoryFn = () => (
    <ScenarioFrame
        label="Ideal result"
        state={getAIValidationDisplayState({ stage: 'complete' })}
        summaryMessage="No date mismatches were found in the reviewed documents."
        findings={matchFindings}
    />
)

export const IdealResult = IdealResultTemplate.bind({})
IdealResult.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const ExpandedMismatch = ExpandedMismatchTemplate.bind({})
ExpandedMismatch.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Pending: StoryFn = () => (
    <ScenarioFrame
        label="Pending"
        state={getAIValidationDisplayState({ stage: 'not-started' })}
        summaryMessage="We have not started reviewing the uploaded documents yet. You can continue reviewing and submit at any time."
    />
)
Pending.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Running: StoryFn = () => (
    <ScenarioFrame
        label="Reviewing documents"
        state={getAIValidationDisplayState({ stage: 'retrieving' })}
        summaryMessage="We are reviewing the uploaded documents and comparing them with the submission dates."
    />
)
Running.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Refreshing: StoryFn = () => (
    <ScenarioFrame
        label="Refreshing after changes"
        state={getAIValidationDisplayState({
            stage: 'retrieving',
            isStale: true,
        })}
        summaryMessage="Your uploaded documents or submission dates changed, so the document review is refreshing."
    />
)
Refreshing.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const TimedOut: StoryFn = () => (
    <ScenarioFrame
        label="Still running after timeout"
        state={getAIValidationDisplayState({ hasTimedOut: true })}
        summaryMessage="Document review is still in progress. You can continue reviewing and submit without waiting for these results."
    />
)
TimedOut.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const LimitedCoverage: StoryFn = () => (
    <ScenarioFrame
        label="Complete with limited coverage"
        state={getAIValidationDisplayState({
            stage: 'complete',
            isPartialCoverage: true,
        })}
        summaryMessage="No date mismatches were found in the reviewed documents."
        findings={matchFindings}
    />
)
LimitedCoverage.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const UnverifiableField: StoryFn = () => (
    <ScenarioFrame
        label="Complete with unverifiable field"
        state={getAIValidationDisplayState({ stage: 'complete' })}
        summaryMessage="A date mismatch was found in the reviewed documents."
        findings={unverifiableFindings}
        expanded
    />
)
UnverifiableField.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const Unavailable: StoryFn = () => (
    <ScenarioFrame
        label="Unavailable"
        state={getAIValidationDisplayState({
            stage: 'failed',
            error: 'We could not load document review results right now. You can continue reviewing and submit without these results.',
        })}
        summaryMessage="We could not load document review results right now. You can continue reviewing and submit without these results."
    />
)
Unavailable.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
