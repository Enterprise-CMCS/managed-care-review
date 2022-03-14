import React from 'react'
import styles from '../Banner.module.scss'
import { Alert, Link } from '@trussworks/react-uswds'

export type UnlockedProps = {
   message?: string
}

export const GenericApiErrorBanner = ({
    message,
}: UnlockedProps): React.ReactElement => {
    return (
        <Alert
            role="alert"
            type="error"
            heading="Something went wrong"
            data-testid="genericApiErrorBanner"
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">
                    <b>{message || 'Your recent action or request failed.'}</b>
                </p>
                <p className="usa-alert__text">
                    <span>
                        Please refresh your browser and if you continue to
                        experience an error,&nbsp;
                    </span>
                    <Link href="mailto:mc-review-team@truss.works">
                        let us know.
                    </Link>
                </p>
            </div>
        </Alert>
    )
}
