import React from 'react'
import styles from '../Banner.module.scss'
import { Alert, Link } from '@trussworks/react-uswds'
import { MAIL_TO_SUPPORT, ERROR_MESSAGES } from '../../../constants/errors'

export type GenericApiErrorProps = {
    heading?: string
    message?: string
    suggestion?: string
}

export const GenericApiErrorBanner = ({
    heading,
    message,
    suggestion,
}: GenericApiErrorProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="error"
            heading={heading || 'System error'}
            validation
            data-testid="error-alert"
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>{message || ERROR_MESSAGES.generic_error}</b>
                </p>
                <p className="usa-alert__text">
                    {suggestion ? (
                        <span>{suggestion} </span>
                    ) : (
                        <>
                            <span>
                                Please refresh your browser and if you continue
                                to experience an error,&nbsp;
                            </span>
                            <Link href={MAIL_TO_SUPPORT}>let us know.</Link>
                        </>
                    )}
                </p>
            </div>
        </Alert>
    )
}
