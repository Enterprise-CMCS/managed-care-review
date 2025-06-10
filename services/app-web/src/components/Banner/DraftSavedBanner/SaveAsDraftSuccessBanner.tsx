import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from '../Banner.module.scss'

export const SaveAsDraftSuccessBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <Alert
            role="alert"
            type="success"
            heading="Draft Saved"
            headingLevel="h4"
            data-testid="saveAsDraftSuccessBanner"
            className={className}
        >
            <div className={styles.bannerBodyText}>
                <p className="usa-alert__text">Draft was saved successfully.</p>
            </div>
        </Alert>
    )
}
