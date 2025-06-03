import React, { useEffect } from 'react'
import classnames from 'classnames'
import { useTealium } from '../../../hooks'
import { ContactSupportLink } from '../../ErrorAlert/ContactSupportLink'
import styles from '../Banner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export const DocumentWarningBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    const { logAlertImpressionEvent } = useTealium()

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message:
                'Some documents aren’t available right now. Refresh the page to try again. If you still see this message email the help desk.',
            type: 'warn',
            extension: 'react-uswds',
        })
    }, [logAlertImpressionEvent])

    return (
        <AccessibleAlertBanner
            role="alert"
            type="warning"
            heading="Document download unavailable"
            headingLevel="h4"
            data-testid="warning-alert"
            className={classnames(className, 'usa-alert__text')}
        >
            <span className={styles.bannerBodyText}>
                <span>
                    Some documents aren’t available right now. Refresh the page
                    to try again. If you still see this message,&nbsp;
                </span>
                <ContactSupportLink />
            </span>
        </AccessibleAlertBanner>
    )
}
