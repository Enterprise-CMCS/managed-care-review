import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIndexUsersQuery, IndexUsersQuery } from '../../gen/gqlClient'
import { CmsUser, AdminUser, StateUser } from '../../gen/gqlClient'
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

    // pick out the part of IndexUsersQuery that specifies Admin/CMS/StateUser
    type UserTypesInIndexQuery = Pick<
        IndexUsersQuery['indexUsers']['edges'][number],
        'node'
    >['node']

    function isCmsUser(obj: UserTypesInIndexQuery): obj is CmsUser {
        return obj.__typename === 'CMSUser'
    }

    const filterForCmsUsers = (data: IndexUsersQuery): CmsUser[] => {
        const cmsUsers = data.indexUsers.edges
            .filter((edge) => isCmsUser(edge.node))
            .map((edge) => edge.node as CmsUser)
        return cmsUsers
    }

    const cmsUsers = filterForCmsUsers(data)

    return (
        <>
            {cmsUsers.map((user) => {
                const name = `${user.givenName} ${user.familyName}`
                const email = user.email
                const stateAssignments = user.stateAssignments
                    ? user.stateAssignments.map((sa) => sa.name).join(', ')
                    : ''
                return (
                    <div key={user.id}>
                        <span>{name}</span>
                        <span>{email}</span>
                        <span>{stateAssignments}</span>
                    </div>
                )
            })}
        </>
    )
}
