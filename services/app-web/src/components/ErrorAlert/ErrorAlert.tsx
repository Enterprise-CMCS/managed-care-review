import classnames from 'classnames'
import React, { useEffect } from 'react'
import styles from './ErrorAlert.module.scss'
import { Alert } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'
import { useTealium } from '../../hooks'
import { extractText } from '../TealiumLogging/tealiamLoggingHelpers'

export type ErrorAlertProps = {
    message?: React.ReactNode
    heading?: string
    calltoAction?: React.ReactNode
    appendLetUsKnow?: boolean
} & React.JSX.IntrinsicElements['div']

export const ErrorAlert = ({
    message,
    heading,
    appendLetUsKnow = false,
    className,
    ...divProps
}: ErrorAlertProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const { logAlertImpressionEvent } = useTealium()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    const classes = classnames(styles.messageBodyText, className)
    const showLink = appendLetUsKnow || !message // our default message includes the link
    const defaultMessage =
        "We're having trouble loading this page. Please refresh your browser and if you continue to experience an error,"

    useEffect(() => {
        const logErrorMessage = `${message ? extractText(message) : defaultMessage} email ${MAIL_TO_SUPPORT}`
        logAlertImpressionEvent({
            error_type: 'system',
            error_message: logErrorMessage,
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
            data-testid="error-alert"
            className={classes}
            {...divProps}
        >
            <span>{message || defaultMessage}</span>

            {showLink && (
                <span>
                    &nbsp;email{' '}
                    <LinkWithLogging
                        className={styles.nowrap}
                        href={MAIL_TO_SUPPORT}
                        variant="unstyled"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {MAIL_TO_SUPPORT}
                    </LinkWithLogging>
                </span>
            )}
        </Alert>
    )
}
