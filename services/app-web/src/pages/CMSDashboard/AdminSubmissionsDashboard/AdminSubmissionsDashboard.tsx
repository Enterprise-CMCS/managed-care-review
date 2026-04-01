import React from 'react'
import { GridContainer, Icon } from '@trussworks/react-uswds'
import { useIndexSubmissionLatestRevisionQuery } from '../../../gen/gqlClient'
import { Loading, NavLinkWithLogging } from '../../../components'
import { ErrorFailedRequestPage } from '../../Errors/ErrorFailedRequestPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { AdminSubmissionsTable } from './AdminSubmissionsTable'
import { RoutesRecord } from '@mc-review/constants'
import styles from './AdminSubmissionsTable.module.scss'

export const AdminSubmissionsDashboard = (): React.ReactElement => {
    const { data, loading, error } = useIndexSubmissionLatestRevisionQuery({
        fetchPolicy: 'cache-and-network',
        pollInterval: 120000,
    })

    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        return (
            <ErrorFailedRequestPage
                error={error}
                testID="admin-submissions-dashboard"
            />
        )
    } else if (!data) {
        return <GenericErrorPage />
    }

    const nodes = data.indexSubmissionLatestRevision.edges.map(
        (edge) => edge.node
    )

    return (
        <GridContainer className={styles.pageContainer}>
            <NavLinkWithLogging
                to={{ pathname: RoutesRecord.DASHBOARD_SUBMISSIONS }}
                event_name="back_button"
            >
                <Icon.ArrowBack />
                <span>&nbsp;Go to dashboard</span>
            </NavLinkWithLogging>
            <h1>Admin submissions</h1>
            <AdminSubmissionsTable data={nodes} />
        </GridContainer>
    )
}
