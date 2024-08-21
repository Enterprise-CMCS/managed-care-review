import React, { useEffect } from 'react'
import styles from './ErrorAlert.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { useTealium } from '../../hooks'
import { LetUsKnowLink } from './LetUsKnowLink'

export type ErrorAlertFailedRequestProps = {
    message?: string
    heading?: string
}
// TODO: Refactor to use Error Alert and switchover components using GenericApiErrorBanner to use this
export const ErrorAlertFailedRequest = ({
    heading,
    message,
}: ErrorAlertFailedRequestProps): React.ReactElement => {
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
                    <LetUsKnowLink />
                </p>
            </div>
        </Alert>
    )
}
