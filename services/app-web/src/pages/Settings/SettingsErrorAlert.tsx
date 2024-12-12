import { ApolloError } from '@apollo/client'
import { GridContainer } from '@trussworks/react-uswds'
import {
    ErrorAlertFailedRequest,
    ErrorAlertSignIn,
    GenericApiErrorBanner,
} from '../../components'
import { handleApolloError } from '@mc-review/helpers'
import { recordJSException } from '@mc-review/otel'
import styles from './Settings.module.scss'

export const SettingsErrorAlert = ({
    error,
    isAuthenticated = true, // By default, assume user is valid because Settings are within wrapped auth routes. We only want to check for authentication when the prop passed in.
    isAdmin = true, // By default, assume user is admin because this error mainly used in settings subcomponents. We only want to check for authentication when the prop passed in.
}: {
    error?: ApolloError | Error
    isAuthenticated?: boolean
    isAdmin?: boolean
}): React.ReactElement | null => {
    if (error) {
        recordJSException(error)
        if (error instanceof ApolloError) {
            handleApolloError(error, true)
        }
    }

    if (!isAdmin) {
        return (
            <div id="settings-page" className={styles.wrapper}>
                <GridContainer
                    data-testid="settings-page"
                    className={styles.container}
                >
                    <GenericApiErrorBanner
                        heading="Admin only"
                        message="Currently only viewable by Admin users"
                    />
                </GridContainer>
            </div>
        )
    } else if (!isAuthenticated) {
        return (
            <div id="settings-page" className={styles.wrapper}>
                <GridContainer
                    data-testid="settings-page"
                    className={styles.container}
                >
                    <ErrorAlertSignIn />
                </GridContainer>
            </div>
        )
    } else if (error) {
        return (
            <div id="settings-page" className={styles.wrapper}>
                <GridContainer
                    data-testid="settings-page"
                    className={styles.container}
                >
                    <ErrorAlertFailedRequest />
                </GridContainer>
            </div>
        )
    } else return null // we are adding this alert to multiple tabs in the UI,  want to have it return nothing if that tab is fine.
}
