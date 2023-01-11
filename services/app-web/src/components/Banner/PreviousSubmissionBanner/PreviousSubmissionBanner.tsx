import React from 'react'
import { Alert, Link } from '@trussworks/react-uswds'

export type UnlockedProps = {
    link: string
}

export const PreviousSubmissionBanner = ({
    link,
}: UnlockedProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="warning"
            heading="Previous Submission"
            headingLevel="h3"
            data-testid="previousSubmissionBanner"
            validation={true}
        >
            <p
                className="usa-alert__text"
                data-testid="previous-submission-banner"
            >
                <span>This is a past version of this submission.&nbsp;</span>
                <Link href={link} data-testid="currentSubmissionLink">
                    View most recent version of this submission
                </Link>
            </p>
        </Alert>
    )
}
