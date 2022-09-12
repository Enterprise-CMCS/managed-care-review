import React from 'react'
import styles from '../Banner.module.scss'
import { Alert, Link } from '@trussworks/react-uswds'
import { MAIL_TO_SUPPORT } from '../../../constants/errors'

export type GenericApiErrorProps = {
    message?: string
    heading?: string
}

export const GenericApiErrorBanner = ({
    message,
    heading,
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
                    <b>
                        {message || "We're having trouble loading this page."}
                    </b>
                </p>
                <p className="usa-alert__text">
                    <span>
                        Please refresh your browser and if you continue to
                        experience an error,&nbsp;
                    </span>
                    <Link href={MAIL_TO_SUPPORT}>let us know.</Link>
                </p>
            </div>
        </Alert>
    )
}
