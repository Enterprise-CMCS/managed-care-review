import React, { useEffect } from 'react'
import styles from './ErrorAlert.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'
import { useTealium } from '../../hooks'

export type ErrorAlertFailedRequestProps = {
    message?: string
    heading?: string
}
// TODO: Refactor to use Error Alert and switchover components using GenericApiErrorBanner to use this
export const ErrorAlertFailedRequest = ({
    heading,
    message,
}: ErrorAlertFailedRequestProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const { logAlertImpressionEvent } = useTealium()

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: message ?? "We're having trouble loading this page.",
            type: 'error',
            extension: 'react-uswds',
        })
    }, [])

    return (
        <Alert
            role="alert"
            type="error"
            heading={heading || 'System error'}
            headingLevel="h4"
            validation
            data-testid="error-alert"
        >
            <div className={styles.messageBodyText}>
                <p className="usa-alert__text">
                    <b>
                        {message || "We're having trouble loading this page."}
                    </b>
                </p>
                <p className="usa-alert__text">
                    <span>
                        Please refresh your browser and if you continue to
                        experience an error,&nbsp;
                    </span>
                    <LinkWithLogging
                        variant="unstyled"
                        href={stringConstants.MAIL_TO_SUPPORT_HREF}
                        target="_blank"
                        rel="noreferrer"
                    >
                        let us know.
                    </LinkWithLogging>
                </p>
            </div>
        </Alert>
    )
}
