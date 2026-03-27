import React from 'react'
import { useIndexSubmissionLatestRevisionQuery } from '../../../gen/gqlClient'
import styles from '../../StateDashboard/StateDashboard.module.scss'
import { Loading } from '../../../components'
import { ErrorFailedRequestPage } from '../../Errors/ErrorFailedRequestPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { AdminSubmissionsTable } from './AdminSubmissionsTable'

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
        <section className={styles.panel}>
            <AdminSubmissionsTable data={nodes} />
        </section>
    )
}
