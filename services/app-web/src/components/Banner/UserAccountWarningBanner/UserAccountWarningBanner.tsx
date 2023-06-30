import styles from '../Banner.module.scss'
import { Alert } from '@trussworks/react-uswds'
import React from 'react'

export type AccountWarningBannerProps = {
    header: string
    message: React.ReactNode
}

const UserAccountWarningBanner = ({
    header,
    message,
}: AccountWarningBannerProps) => {
    return (
        <div className={styles.bannerBodyText}>
            <Alert type="warning" headingLevel="h4" heading={header}>
                {message}
            </Alert>
        </div>
    )
}

export { UserAccountWarningBanner }
