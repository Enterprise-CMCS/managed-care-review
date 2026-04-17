import React from 'react'
import { Table } from '@trussworks/react-uswds'
import type { AIValidationDisplayItem } from './aiValidationFindings'
import styles from './ReviewSubmit.module.scss'

interface Props {
    findings: AIValidationDisplayItem[]
}

export const AIValidationFindingsCard = ({
    findings,
}: Props): React.ReactElement => {
    return (
        <Table fullWidth bordered={false}>
            <thead>
                <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Details</th>
                </tr>
            </thead>
            <tbody>
                {findings.map((finding) => (
                    <tr
                        key={`${finding.fieldLabel}-${finding.outcomeLabel}-${finding.message}`}
                    >
                        <th scope="row">{finding.fieldLabel}</th>
                        <td>{finding.outcomeLabel}</td>
                        <td>{finding.confidenceLabel}</td>
                        <td>
                            <div className={styles.findingDetails}>
                                <p className={styles.findingMessage}>
                                    {finding.message}
                                </p>
                                {finding.citations.length > 0 ? (
                                    <div className={styles.findingEvidence}>
                                        <p
                                            className={
                                                styles.findingEvidenceLabel
                                            }
                                        >
                                            Evidence
                                        </p>
                                        <ul
                                            className={
                                                styles.findingEvidenceList
                                            }
                                        >
                                            {finding.citations.map(
                                                (citation) => (
                                                    <li
                                                        key={`${finding.fieldLabel}-${citation.documentName}-${citation.orderLabel}`}
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
                                                            {citation.pageLabel}
                                                        </span>
                                                        <span>
                                                            {
                                                                citation.orderLabel
                                                            }
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                ) : (
                                    <p
                                        className={
                                            styles.findingEvidenceFallback
                                        }
                                    >
                                        No citation details available.
                                    </p>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}
