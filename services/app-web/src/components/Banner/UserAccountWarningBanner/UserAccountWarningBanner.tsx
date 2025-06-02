import React, { useEffect } from 'react'
import { useTealium } from '../../../hooks'
import { extractText } from '../../TealiumLogging/tealiamLoggingHelpers'
import { ContactSupportLink } from '../../ErrorAlert/ContactSupportLink'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export type AccountWarningBannerProps = {
    header?: string
    message?: React.ReactNode
}

const MissingDivisionMessage = () => {
    return (
        <span>
            You must be assigned to a division in order to ask questions about a
            submission. Please&nbsp;
            <ContactSupportLink />
            &nbsp;to add your division.
        </span>
    )
}

// By default this is the missing division account warning
const UserAccountWarningBanner = ({
    header = 'Missing division',
    message = <MissingDivisionMessage />,
}: AccountWarningBannerProps) => {
    const { logAlertImpressionEvent } = useTealium()

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: extractText(message),
            type: 'warn',
            extension: 'react-uswds',
        })
    }, [logAlertImpressionEvent, message])
    return (
        <AccessibleAlertBanner
            role="alert"
            type="warning"
            headingLevel="h4"
            heading={header}
        >
            {message}
        </AccessibleAlertBanner>
    )
}

export { UserAccountWarningBanner }
