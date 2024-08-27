import classnames from 'classnames'
import React, { useEffect } from 'react'
import styles from './ErrorAlert.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { useTealium } from '../../hooks'
import { extractText } from '../TealiumLogging/tealiamLoggingHelpers'
import { ErrorRemediation, RemediationType } from './ErrorRemediations'

export type ErrorAlertProps = {
    heading?: string // Has a default for generic error
    message?: React.ReactNode // Has a default for generic error.
    withEmphasis?: boolean
    remediation?: RemediationType
} & React.JSX.IntrinsicElements['div']

/*
    Error alert is main error display in the application.
    It is used for variety of purposes including API error handling and displaying full page messages during maintainece.

    A heading and a message is always displayed with fallbacks to a generic system error.

    An optional remediation message may displayed in a second paragraph. Remediation includes specific instructions about what the user can do to
    fix the errors, such as refreshing page or contacting support. A mailto link to contact the help desk is often included in the remediation message as well.

    If the alert is displayed withEmphasis, the message is defined into two paragraphs, the first paragraph is displayed bold.
*/

export const ErrorAlert = ({
    heading = 'System error',
    message = "We're having trouble loading this page.",
    remediation,
    withEmphasis,
    className,
    ...divProps
}: ErrorAlertProps): React.ReactElement => {
    const { logAlertImpressionEvent } = useTealium()
    const classes = classnames(styles.messageBodyText, className)
    const loggingErrorMessage = extractText(message)

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: loggingErrorMessage,
            type: 'error',
            extension: 'react-uswds',
        })
    }, [loggingErrorMessage, logAlertImpressionEvent])

    return (
        <Alert
            role="alert"
            type="error"
            heading={heading || 'System error'}
            headingLevel="h4"
            data-testid="error-alert"
            validation
            className={classes}
            {...divProps}
        >
            <div className={styles.messageBodyText}>
                {withEmphasis ? (
                    <>
                        <p className="usa-alert__text">
                            <b>{message}</b>
                        </p>
                        <p className="usa-alert__text">
                            <ErrorRemediation type={remediation} />
                        </p>
                    </>
                ) : (
                    <p className="usa-alert__text">
                        {message}&nbsp;
                        <ErrorRemediation type={remediation} />
                    </p>
                )}
            </div>
        </Alert>
    )
}
