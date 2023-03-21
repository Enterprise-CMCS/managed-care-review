import { ApolloError } from '@apollo/client'
import { GridContainer } from '@trussworks/react-uswds'
import {
    ErrorAlertFailedRequest,
    GenericApiErrorBanner,
} from '../../components'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { recordJSException } from '../../otelHelpers'
import styles from './Settings.module.scss'

export const SettingsErrorAlert = ({
    error,
    isAdmin = false,
}: {
    error?: ApolloError
    isAdmin?: boolean
}): React.ReactElement | null => {
    if (error) {
        recordJSException(error)
        handleApolloError(error, true)
    }
    if (isAdmin) {
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
    } else return null
}
