import React, { useEffect, useRef, useState } from 'react'
import { Alert } from '@trussworks/react-uswds'
import { ButtonWithLogging } from '../../../../components'
import { AIValidationFindingsCard } from './AIValidationFindingsCard'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import type { AIValidationCoverageSummary } from './aiValidationCoverage'
import type { AIValidationDisplayState } from './aiValidationStatus'
import styles from './ReviewSubmit.module.scss'

export type AIValidationBannerMode = 'status' | 'findings'

interface Props {
    mode: AIValidationBannerMode
    state: AIValidationDisplayState
    findings?: AIValidationDisplayItem[]
    coverageSummary?: AIValidationCoverageSummary | null
}

function formatPartialCoverageMessage(
    coverageSummary: AIValidationCoverageSummary
): string {
    const detailParts = [
        coverageSummary.failedDocuments > 0
            ? `${coverageSummary.failedDocuments} failed`
            : null,
        coverageSummary.deferredDocuments > 0
            ? `${coverageSummary.deferredDocuments} deferred`
            : null,
        coverageSummary.ocrCappedDocuments > 0
            ? `${coverageSummary.ocrCappedDocuments} OCR-capped`
            : null,
    ].filter((part): part is string => part != null)

    const detailSuffix =
        detailParts.length > 0 ? ` (${detailParts.join(', ')})` : ''

    return `Limited coverage: ${coverageSummary.unprocessedDocuments} eligible uploaded document${coverageSummary.unprocessedDocuments === 1 ? '' : 's'} ${coverageSummary.unprocessedDocuments === 1 ? 'was' : 'were'} not fully reviewed${detailSuffix}.`
}

export const AIValidationStatusCard = ({
    mode,
    state,
    findings = [],
    coverageSummary = null,
}: Props): React.ReactElement => {
    const showFindings = mode === 'findings' && findings.length > 0
    const showPartialCoverageNote = coverageSummary?.isPartial === true
    const [findingsExpanded, setFindingsExpanded] = useState(showFindings)
    const hadFindingsRef = useRef(showFindings)

    useEffect(() => {
        if (showFindings && !hadFindingsRef.current) {
            setFindingsExpanded(true)
        }

        hadFindingsRef.current = showFindings
    }, [showFindings])

    return (
        <Alert
            type={showFindings ? 'success' : state.alertType}
            headingLevel="h2"
            heading={showFindings ? 'Document review results' : state.title}
            slim={!showFindings}
        >
            <p>
                {showFindings
                    ? showPartialCoverageNote
                        ? 'We compared the dates in this submission with the uploaded documents we could review. These results are advisory and do not block submission.'
                        : 'We compared the dates in this submission with the uploaded documents. These results are advisory and do not block submission.'
                    : state.message}
            </p>
            {showPartialCoverageNote && (
                <p>{formatPartialCoverageMessage(coverageSummary)}</p>
            )}
            {showFindings && (
                <>
                    {findingsExpanded && (
                        <div
                            id="validation-findings-table"
                            className={styles.validationFindingsContent}
                        >
                            <AIValidationFindingsCard findings={findings} />
                        </div>
                    )}
                    <ButtonWithLogging
                        type="button"
                        unstyled
                        parent_component_type="toggle"
                        className={`${styles.validationFindingsToggle} usa-link`}
                        onClick={() =>
                            setFindingsExpanded((expanded) => !expanded)
                        }
                        aria-expanded={findingsExpanded}
                        aria-controls="validation-findings-table"
                    >
                        {findingsExpanded ? 'Show less' : 'Show more'}
                    </ButtonWithLogging>
                </>
            )}
        </Alert>
    )
}
