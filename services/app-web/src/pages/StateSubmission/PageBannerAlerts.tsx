import React from 'react'
import {
    GenericApiErrorBanner,
    SubmissionUnlockedBanner,
} from '../../components'
import { UpdateInformation, User } from '../../gen/gqlClient'
import { AccessibleAlertBanner } from '../../components/Banner/AccessibleAlertBanner/AccessibleAlertBanner'

const PageBannerAlerts = ({
    showPageErrorMessage,
    loggedInUser,
    unlockedInfo,
    draftSaved,
}: {
    showPageErrorMessage: string | boolean
    loggedInUser?: User
    unlockedInfo?: UpdateInformation | null
    draftSaved?: boolean
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
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockedInfo}
                />
            )}
            {draftSaved && (
                <AccessibleAlertBanner
                    role="alert"
                    type="success"
                    heading="Draft Saved"
                    headingLevel="h4"
                    data-testid="saveAsDraftSuccessBanner"
                    children={<>Draft was saved successfully.</>}
                    tabIndex={-1}
                />
            )}
        </>
    )
}

export { PageBannerAlerts }
