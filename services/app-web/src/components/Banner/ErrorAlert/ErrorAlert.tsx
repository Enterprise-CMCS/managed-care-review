import React from 'react'
import styles from '../Banner.module.scss'
import { Alert, Link } from '@trussworks/react-uswds'
import { MAIL_TO_SUPPORT } from '../../../constants/errors'
export type ErrorAlertProps = {
    message?: string | React.ReactNode
    heading?: string
} & JSX.IntrinsicElements['div']

export const ErrorAlert = ({
    message,
    heading,
    ...divProps
}: ErrorAlertProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="error"
            heading={heading || 'System error'}
            data-testid="error-alert"
            className={styles.messageBodyText}
            {...divProps}
        >
            <span>
                {message ||
                    "We're having trouble loading this page. Please refresh your browser and if you continue to experience an error,"}
            </span>
            <Link href={MAIL_TO_SUPPORT}>&nbsp;let us know.</Link>
        </Alert>
    )
}
//
