import React from 'react'
import { InfoTag } from '../../../../components'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import styles from './ReviewSubmit.module.scss'

interface Props {
    findings: AIValidationDisplayItem[]
}

const outcomeTagColor = (
    outcome: AIValidationDisplayItem['outcome']
): Parameters<typeof InfoTag>[0]['color'] => {
    if (outcome === 'match') {
        return 'green'
    }

    if (outcome === 'mismatch') {
        return 'gold'
    }

    return 'gray-medium'
}

const confidenceTagColor = (
    confidence: AIValidationDisplayItem['confidence']
): Parameters<typeof InfoTag>[0]['color'] => {
    if (confidence === 'high') {
        return 'green'
    }

    if (confidence === 'medium') {
        return 'gold'
    }

    return 'gray'
}

function buildFindingsSummary(findings: AIValidationDisplayItem[]): string {
    const mismatchCount = findings.filter(
        (finding) => finding.outcome === 'mismatch'
    ).length
    const matchCount = findings.filter(
        (finding) => finding.outcome === 'match'
    ).length
    const unverifiableCount = findings.filter(
        (finding) => finding.outcome === 'not-enough-evidence'
    ).length

    const parts = [
        mismatchCount > 0
            ? `${mismatchCount} date${mismatchCount === 1 ? '' : 's'} need${mismatchCount === 1 ? 's' : ''} review`
            : null,
        matchCount > 0
            ? `${matchCount} date${matchCount === 1 ? '' : 's'} match${matchCount === 1 ? 'es' : ''} the reviewed documents`
            : null,
        unverifiableCount > 0
            ? `${unverifiableCount} date${unverifiableCount === 1 ? '' : 's'} could not be verified`
            : null,
    ].filter((part): part is string => part != null)

    return parts.map((part) => `${part}.`).join(' ')
}

export const AIValidationFindingsCard = ({
    findings,
}: Props): React.ReactElement => {
    return (
        <>
            <p className={styles.validationFindingsSummary}>
                {buildFindingsSummary(findings)}
            </p>
            <div className={styles.validationFindingsCards}>
                {findings.map((finding) => {
                    const primaryDocumentCount = new Set(
                        finding.primaryCitations.map(
                            (citation) => citation.documentName
                        )
                    ).size
                    const supportingDocumentCount =
                        finding.supportingCitations.length > 0
                            ? (finding.evidenceSummary
                                  ?.supportingDocumentCount ??
                              new Set([
                                  ...finding.primaryCitations.map(
                                      (citation) => citation.documentName
                                  ),
                                  ...finding.supportingCitations.map(
                                      (citation) => citation.documentName
                                  ),
                              ]).size)
                            : 0
                    const additionalSupportingDocumentCount = Math.max(
                        supportingDocumentCount - primaryDocumentCount,
                        new Set(
                            finding.supportingCitations.map(
                                (citation) => citation.documentName
                            )
                        ).size
                    )

                    return (
                        <article
                            key={`${finding.fieldLabel}-${finding.outcomeLabel}-${finding.message}`}
                            className={styles.validationFindingCard}
                        >
                            <div className={styles.validationFindingCardHeader}>
                                <h3
                                    className={
                                        styles.validationFindingFieldLabel
                                    }
                                >
                                    {finding.fieldLabel}
                                </h3>
                                <div
                                    className={styles.validationFindingMetaList}
                                >
                                    <div
                                        className={
                                            styles.validationFindingMetaItem
                                        }
                                    >
                                        <span
                                            className={
                                                styles.validationFindingMetaLabel
                                            }
                                        >
                                            Result:
                                        </span>
                                        <InfoTag
                                            color={outcomeTagColor(
                                                finding.outcome
                                            )}
                                            className={styles.findingOutcomeTag}
                                        >
                                            {finding.outcomeLabel}
                                        </InfoTag>
                                    </div>
                                    <div
                                        className={
                                            styles.validationFindingMetaItem
                                        }
                                    >
                                        <span
                                            className={
                                                styles.validationFindingMetaLabel
                                            }
                                        >
                                            Confidence:
                                        </span>
                                        <InfoTag
                                            color={confidenceTagColor(
                                                finding.confidence
                                            )}
                                            className={
                                                styles.findingConfidenceTag
                                            }
                                        >
                                            {finding.confidenceLabel}
                                        </InfoTag>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.findingDetails}>
                                <p className={styles.findingMessage}>
                                    {finding.message}
                                </p>
                                {finding.comparedValues && (
                                    <dl
                                        className={
                                            styles.findingValueComparison
                                        }
                                    >
                                        <div>
                                            <dt>Submitted:</dt>
                                            <dd>
                                                {
                                                    finding.comparedValues
                                                        .submittedValue
                                                }
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Reviewed documents:</dt>
                                            <dd>
                                                {
                                                    finding.comparedValues
                                                        .reviewedValue
                                                }
                                            </dd>
                                        </div>
                                    </dl>
                                )}
                                {finding.reasonLabel && (
                                    <p className={styles.findingReason}>
                                        <span
                                            className={
                                                styles.findingReasonLabel
                                            }
                                        >
                                            Reason:
                                        </span>{' '}
                                        {finding.reasonLabel}
                                    </p>
                                )}
                                {finding.advisoryNote && (
                                    <p className={styles.findingAdvisory}>
                                        {finding.advisoryNote}
                                    </p>
                                )}
                                {finding.primaryCitations.length > 0 ? (
                                    <div className={styles.findingEvidence}>
                                        <p
                                            className={
                                                styles.findingEvidenceLabel
                                            }
                                        >
                                            Primary reviewed reference:
                                        </p>
                                        <ul
                                            className={
                                                styles.findingEvidenceList
                                            }
                                        >
                                            {finding.primaryCitations.map(
                                                (citation) => (
                                                    <li
                                                        key={`${finding.fieldLabel}-${citation.documentName}`}
                                                        className={
                                                            styles.findingEvidenceItem
                                                        }
                                                    >
                                                        <span>
                                                            {
                                                                citation.documentName
                                                            }
                                                        </span>
                                                        <span>
                                                            {citation.pageLabels.join(
                                                                ', '
                                                            )}
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                        {finding.supportingCitations.length >
                                            0 && (
                                            <>
                                                <p
                                                    className={
                                                        styles.findingEvidenceLabel
                                                    }
                                                >
                                                    {`Additional supporting references from ${additionalSupportingDocumentCount} reviewed document${additionalSupportingDocumentCount === 1 ? '' : 's'}:`}
                                                </p>
                                                <ul
                                                    className={
                                                        styles.findingEvidenceList
                                                    }
                                                >
                                                    {finding.supportingCitations.map(
                                                        (citation) => (
                                                            <li
                                                                key={`${finding.fieldLabel}-supporting-${citation.documentName}`}
                                                                className={
                                                                    styles.findingEvidenceItem
                                                                }
                                                            >
                                                                <span>
                                                                    {
                                                                        citation.documentName
                                                                    }
                                                                </span>
                                                                <span>
                                                                    {citation.pageLabels.join(
                                                                        ', '
                                                                    )}
                                                                </span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p
                                        className={
                                            styles.findingEvidenceFallback
                                        }
                                    >
                                        No reviewed document reference
                                        available.
                                    </p>
                                )}
                            </div>
                        </article>
                    )
                })}
            </div>
        </>
    )
}
