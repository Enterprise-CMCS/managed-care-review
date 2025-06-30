import React from 'react'
import styles from './Errors.module.scss'

import { PageHeading } from '../../components/PageHeading'
import { GridContainer } from '@trussworks/react-uswds'
import { handleGraphQLError, isLikelyUserAuthError } from '@mc-review/helpers'
import { ErrorAlertFailedRequest, ErrorAlertSignIn } from '../../components'
import { useAuth } from '../../contexts/AuthContext'

/*
    For use with an unknown error coming back from API requests
    - full takeover of the main app content below the header
    - specific ErrorAlert displayed at top of page
    - handles OTEL logging
*/

export const ErrorFailedRequestPage = ({
    error,
    testID,
}: {
    error: Error
    testID: string
}): React.ReactElement => {
    const { loginStatus } = useAuth()
    const isAuthenticated = loginStatus === 'LOGGED_IN'
    handleGraphQLError(error as any, isAuthenticated)

    return (
        <section data-testid={testID} className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading> Error </PageHeading>
                {isLikelyUserAuthError(error as any, isAuthenticated) ? (
                    <ErrorAlertSignIn />
                ) : (
                    <ErrorAlertFailedRequest />
                )}
            </GridContainer>
        </section>
    )
}
