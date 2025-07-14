import React from 'react'
import styles from './Errors.module.scss'

import { PageHeading } from '../../components/PageHeading'
import { GridContainer } from '@trussworks/react-uswds'
import { ApolloError } from '@apollo/client'
import { handleApolloError, isLikelyUserAuthError } from '@mc-review/helpers'
import { ErrorAlertFailedRequest, ErrorAlertSignIn } from '../../components'
import { useAuth } from '../../contexts/AuthContext'

/*
    For use with an unknown ApolloError coming back from API requests
    - full takeover of the main app content below the header
    - specific ErrorAlert displayed at top of page
    - handles OTEL logging
*/

export const ErrorFailedRequestPage = ({
    error,
    testID,
}: {
    error: ApolloError
    testID: string
}): React.ReactElement => {
    const { loginStatus } = useAuth()
    const isAuthenticated = loginStatus === 'LOGGED_IN'
    handleApolloError(error, isAuthenticated)

    return (
        <section data-testid={testID} className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading> Error </PageHeading>
                {isLikelyUserAuthError(error, isAuthenticated) ? (
                    <ErrorAlertSignIn />
                ) : (
                    <ErrorAlertFailedRequest />
                )}
            </GridContainer>
        </section>
    )
}
