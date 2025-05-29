import React, { useEffect } from 'react'
import classnames from 'classnames'
import { useTealium } from '../../../hooks'
import { extractText } from '../../TealiumLogging/tealiamLoggingHelpers'
import styles from '../../ErrorAlert/ErrorAlert.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'

export type IncompleteSubmissionProps = {
    message?: string
    heading?: string
} & React.JSX.IntrinsicElements['div']

export const IncompleteSubmissionBanner = ({
    heading = 'Incomplete Submission',
    message = 'Submission is incomplete.',
    className,
    ...divProps
}: IncompleteSubmissionProps): React.ReactElement => {
    const { logAlertImpressionEvent } = useTealium()
    const classes = classnames(styles.messageBodyText, className)
    const loggingErrorMessage = extractText(message)

    useEffect(() => {
        logAlertImpressionEvent({
            error_type: 'validation',
            error_message: loggingErrorMessage,
            type: 'error',
            extension: 'react-uswds',
        })
    }, [loggingErrorMessage, logAlertImpressionEvent])

    return (
        <AccessibleAlertBanner
            role="alert"
            type="error"
            heading={heading || 'Validation error'}
            headingLevel="h4"
            data-testid="error-alert"
            validation
            className={classes}
            {...divProps}
        >
            <div className={styles.messageBodyText}>
                <p className="usa-alert__text">{message}&nbsp;</p>
            </div>
        </AccessibleAlertBanner>
    )
}
