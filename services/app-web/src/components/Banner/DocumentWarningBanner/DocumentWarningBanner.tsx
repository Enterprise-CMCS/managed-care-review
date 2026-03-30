import React, { useEffect } from 'react'
import { useTealium } from '../../../hooks'
import { ContactSupportLink } from '../../ErrorAlert/ContactSupportLink'
import styles from './DocumentWarningBanner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

// .documentWarningBody {
//     margin-top: 0;
//     margin-bottom: 2px;
// }

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
            className={className}
            validation
        >
            <p className={styles.documentWarningBody}>
                <span>
                    Some documents aren’t available right now. Refresh the page
                    to try again. If you still see this message,&nbsp;
                </span>
                <ContactSupportLink />
            </p>
        </AccessibleAlertBanner>
    )
}
