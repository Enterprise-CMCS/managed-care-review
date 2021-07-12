import React from 'react'
import { Alert } from '@trussworks/react-uswds'

import styles from './Dashboard.module.scss'

export function SubmissionSuccessMessage({
    submissionName,
}: {
    submissionName: string
}): React.ReactElement {
    return (
        <div className={styles.alertContainer}>
            <Alert
                type="success"
                heading={submissionName + ' was sent to CMS'}
                validation={true}
            >
                <div className={styles.alert}>
                    <div>
                        If you have questions about your submission, please
                        contact&nbsp;
                        <a href="mailto:mc-review-team@truss.works">
                            mc-review-team@truss.works
                        </a>
                    </div>
                    <div>Here’s what comes next:</div>
                    <ol>
                        <li>
                            <strong>Completeness check:</strong> CMS will review
                            all documentation submitted to ensure all required
                            materials were received.
                        </li>
                        <li>
                            <strong>CMS review:</strong> Your submission will be
                            reviewed by CMS for adherence to federal
                            regulations. If a rate certification is included it
                            will be reviewed for policy adherence and actuarial
                            soundness.
                        </li>
                        <li>
                            <strong>Questions:</strong> You may receive
                            questions via email from CMS as they conduct their
                            reviews.
                        </li>
                        <li>
                            <strong>Decision:</strong> Once all questions have
                            been addressed, CMS will contact you with their
                            final recommendation.
                        </li>
                    </ol>
                </div>
            </Alert>
        </div>
    )
}
