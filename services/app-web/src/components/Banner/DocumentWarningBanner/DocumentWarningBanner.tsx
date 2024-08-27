import React, { useEffect } from 'react'
import { Alert } from '@trussworks/react-uswds'

import classnames from 'classnames'
import { useTealium } from '../../../hooks'
import { ContactSupportLink } from '../../ErrorAlert/ContactSupportLink'

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
        <Alert
            role="alert"
            type="warning"
            heading={`Document download unavailable`}
            headingLevel="h4"
            data-testid="warning-alert"
            className={classnames(className, 'usa-alert__text')}
        >
            <span>
                Some documents aren’t available right now. Refresh the page to
                try again. If you still see this message,&nbsp;
            </span>
            <ContactSupportLink />
        </Alert>
    )
}
