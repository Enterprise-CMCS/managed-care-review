import React from 'react'
import { LinkWithLogging } from '../../TealiumLogging/Link'
import styles from '../Banner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export type UnlockedProps = {
    link: string
}

export const PreviousSubmissionBanner = ({
    link,
}: UnlockedProps): React.ReactElement => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="warning"
            heading="Previous Submission"
            headingLevel="h4"
            data-testid="previousSubmissionBanner"
            validation
        >
            <div className={styles.bannerBodyText}>
                <p
                    className="usa-alert__text"
                    data-testid="previous-submission-banner"
                >
                    <span>
                        This is a past version of this submission.&nbsp;
                    </span>
                    <LinkWithLogging
                        href={link}
                        data-testid="currentSubmissionLink"
                    >
                        View most recent version of this submission
                    </LinkWithLogging>
                </p>
            </div>
        </AccessibleAlertBanner>
    )
}
