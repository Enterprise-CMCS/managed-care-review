import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { useTealium } from '../../../hooks'
import { extractText } from '../../TealiumLogging/tealiamLoggingHelpers'

export type AccountWarningBannerProps = {
    header: string
    message: React.ReactNode
}

const UserAccountWarningBanner = ({
    header,
    message,
}: AccountWarningBannerProps) => {
    const { logAlertImpressionEvent } = useTealium()

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: extractText(message),
            type: 'warn',
            extension: 'react-uswds',
        })
    }, [logAlertImpressionEvent,message])
    return (
        <div className={styles.bannerBodyText}>
            <Alert type="warning" headingLevel="h4" heading={header}>
                {message}
            </Alert>
        </div>
    )
}

export { UserAccountWarningBanner }
