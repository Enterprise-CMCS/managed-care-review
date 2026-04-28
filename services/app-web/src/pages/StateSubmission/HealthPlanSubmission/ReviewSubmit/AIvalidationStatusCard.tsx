import React from 'react'
import { ButtonWithLogging, Spinner } from '../../../../components'
import { AIValidationFindingsCard } from './AIValidationFindingsCard'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import type { AIValidationDisplayState } from './aiValidationStatus'
import styles from './ReviewSubmit.module.scss'

interface SharedProps {
    state: AIValidationDisplayState
}

interface SummaryProps extends SharedProps {
    summaryMessage: string
    secondaryMessage?: string
    showDetailsToggle: boolean
    findingsExpanded: boolean
    onToggleFindings: () => void
}

interface DetailsProps {
    findings?: AIValidationDisplayItem[]
}

export const AIValidationStatusHeader = ({
    state,
    summaryMessage,
    secondaryMessage,
    showDetailsToggle,
    findingsExpanded,
    onToggleFindings,
}: SummaryProps): React.ReactElement => {
    return (
        <div
            className={styles.validationStatusHeader}
            role="status"
            aria-label="Document review summary"
            aria-live="polite"
            aria-atomic="true"
        >
            <div className={styles.validationStatusSummary}>
                {state.isPolling && (
                    <span aria-hidden="true" className={styles.validationIcon}>
                        <Spinner size="small" />
                    </span>
                )}
                <div className={styles.validationStatusText}>
                    <p className={styles.validationStatusTitle}>{state.title}</p>
                    <p className={styles.validationStatusMessage}>
                        {summaryMessage}
                    </p>
                </div>
            </div>
            {secondaryMessage && (
                <p className={styles.validationStatusSecondary}>
                    {secondaryMessage}
                </p>
            )}
            {showDetailsToggle && (
                <ButtonWithLogging
                    type="button"
                    unstyled
                    parent_component_type="toggle"
                    className={`${styles.validationFindingsToggle} usa-link`}
                    onClick={onToggleFindings}
                    aria-expanded={findingsExpanded}
                    aria-controls="validation-review-details"
                >
                    {findingsExpanded
                        ? 'Hide document review'
                        : 'View document review'}
                </ButtonWithLogging>
            )}
        </div>
    )
}

export const AIValidationStatusDetails = ({
    findings = [],
}: DetailsProps): React.ReactElement | null => {
    if (findings.length === 0) {
        return null
    }

    return (
        <div
            id="validation-review-details"
            className={styles.validationDetailsPanel}
            aria-label="Document review details"
        >
            <h3 className={styles.validationDetailsHeading}>
                Document review details
            </h3>
            <p className={styles.validationDetailsMessage}>
                These results are advisory and do not block submission.
            </p>
            <div className={styles.validationFindingsContent}>
                <AIValidationFindingsCard findings={findings} />
            </div>
        </div>
    )
}
