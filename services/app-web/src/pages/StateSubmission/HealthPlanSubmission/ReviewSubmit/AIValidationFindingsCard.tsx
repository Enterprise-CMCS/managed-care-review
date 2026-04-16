import React from 'react'
import { Alert, Table } from '@trussworks/react-uswds'
import type { AIValidationDisplayItem } from './aiValidationFindings'

interface Props {
    findings: AIValidationDisplayItem[]
}

export const AIValidationFindingsCard = ({
    findings,
}: Props): React.ReactElement => {
    return (
        <Alert type="success" headingLevel="h2" heading="Validation findings">
            <p>
                We reviewed the uploaded documents and found the following
                results.
            </p>
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
                            <td>{finding.message}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Alert>
    )
}
