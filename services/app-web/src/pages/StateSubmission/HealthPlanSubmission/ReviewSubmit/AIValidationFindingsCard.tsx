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
                    <th scope="col">Submission field</th>
                    <th scope="col">Result</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">What we found</th>
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
                                            Supporting document reference
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
                                        No supporting document reference
                                        available.
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
