import React from 'react'
import {
    GenericApiErrorBanner,
    SubmissionUnlockedBanner,
} from '../../components'
import { UpdateInformation, User } from '../../gen/gqlClient'
import styles from './StateSubmissionForm.module.scss'

const PageBannerAlerts = ({
    showPageErrorMessage,
    loggedInUser,
    unlockedInfo,
}: {
    showPageErrorMessage: string | boolean
    loggedInUser?: User
    unlockedInfo?: UpdateInformation | null
}): React.ReactElement => {
    const message =
        typeof showPageErrorMessage !== 'boolean'
            ? showPageErrorMessage
            : undefined
    return (
        <>
            {showPageErrorMessage && (
                <GenericApiErrorBanner message={message} />
            )}
            {unlockedInfo && (
                <SubmissionUnlockedBanner
                    className={styles.banner}
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockedInfo}
                />
            )}
        </>
    )
}

export { PageBannerAlerts }
