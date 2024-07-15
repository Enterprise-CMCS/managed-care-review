import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import { LinkWithLogging } from '../../TealiumLogging/Link'

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
            headingLevel="h4"
            data-testid="previousSubmissionBanner"
            validation={true}
        >
            <p
                className="usa-alert__text"
                data-testid="previous-submission-banner"
            >
                <span>This is a past version of this submission.&nbsp;</span>
                <LinkWithLogging
                    href={link}
                    data-testid="currentSubmissionLink"
                >
                    View most recent version of this submission
                </LinkWithLogging>
            </p>
        </Alert>
    )
}
