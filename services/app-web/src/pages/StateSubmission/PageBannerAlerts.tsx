import {
    GenericApiErrorBanner,
    SubmissionUnlockedBanner,
} from '../../components'
import { UpdateInformation, User } from '../../gen/gqlClient'
import styles from './StateSubmissionForm.module.scss'
import { hasCMSUserPermissions } from '../../gqlHelpers'

const PageBannerAlerts = ({
    showPageErrorMessage,
    loggedInUser,
    unlockedInfo,
}: {
    showPageErrorMessage: string | boolean
    loggedInUser?: User
    unlockedInfo?: UpdateInformation | null
}): JSX.Element => {
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
                    userType={
                        hasCMSUserPermissions(loggedInUser)
                            ? 'CMS_USER'
                            : 'STATE_USER'
                    }
                    unlockedBy={unlockedInfo?.updatedBy || 'Not available'}
                    unlockedOn={unlockedInfo.updatedAt || 'Not available'}
                    reason={unlockedInfo.updatedReason || 'Not available'}
                    className={styles.banner}
                />
            )}
        </>
    )
}

export { PageBannerAlerts }
