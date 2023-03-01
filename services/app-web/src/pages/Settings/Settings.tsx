import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIndexUsersQuery, IndexUsersQuery } from '../../gen/gqlClient'
import { CmsUser } from '../../gen/gqlClient'
import styles from '../StateDashboard/StateDashboard.module.scss'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import {
    handleApolloError,
    isLikelyUserAuthError,
} from '../../gqlHelpers/apolloErrors'
import {
    ErrorAlertFailedRequest,
    ErrorAlertSignIn,
    Loading,
} from '../../components'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'

export const Settings = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const ldClient = useLDClient()
    const { loading, data, error } = useIndexUsersQuery({
        fetchPolicy: 'network-only',
    })
    const isAuthenticated = loginStatus === 'LOGGED_IN'

    if (error) {
        handleApolloError(error, isAuthenticated)
        if (isLikelyUserAuthError(error, isAuthenticated)) {
            return (
                <div id="cms-dashboard-page" className={styles.wrapper}>
                    <GridContainer
                        data-testid="cms-dashboard-page"
                        className={styles.container}
                    >
                        <ErrorAlertSignIn />
                    </GridContainer>
                </div>
            )
        } else {
            return (
                <div id="cms-dashboard-page" className={styles.wrapper}>
                    <GridContainer
                        data-testid="cms-dashboard-page"
                        className={styles.container}
                    >
                        <ErrorAlertFailedRequest />
                    </GridContainer>
                </div>
            )
        }
    }

    if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
        return <Loading />
    }
    function isCMSUser(
        obj: CmsUser | IndexUsersQuery
    ): obj is CmsUser | IndexUsersQuery {
        return obj !== undefined && obj !== null && obj.__typename === 'CMSUser'
    }

    // const tableData = data.indexUsers.edges
    const cmsUsers = data.return(
        <>
            {cmsUsers.map((user) => {
                const name = `${user.node.givenName} ${user.node.familyName}`
                const email = user.node.email
                const stateAssignments = user.node.stateAssignments
                    ? user.node.stateAssignments.map((sa) => sa.name).join(', ')
                    : ''
                return (
                    <div key={user.node.id}>
                        <span>{`${user.node.givenName} ${user.node.familyName}`}</span>
                        <span>{user.node.email}</span>
                    </div>
                )
            })}
        </>
    )
}
