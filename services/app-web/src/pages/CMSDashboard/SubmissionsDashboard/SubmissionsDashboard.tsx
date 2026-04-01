import React from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useIndexSubmissionsQuery } from '../../../gen/gqlClient'
import styles from '../../StateDashboard/StateDashboard.module.scss'
import {
    Loading,
    ContractTable,
    ContractInDashboardType,
} from '../../../components'
import { ErrorFailedRequestPage } from '../../Errors/ErrorFailedRequestPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

const SubmissionsDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { data, loading, error } = useIndexSubmissionsQuery({
        fetchPolicy: 'cache-and-network',
        pollInterval: 120000,
    })

    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        return (
            <ErrorFailedRequestPage
                error={error}
                testID="submissions-dashboard"
            />
        )
    } else if (!data || !loggedInUser) {
        return <GenericErrorPage />
    }

    const submissionRows: ContractInDashboardType[] =
        data.indexSubmissions.edges.map((edge: any) => ({
            id: edge.node.id,
            name: edge.node.name,
            programs: edge.node.programs,
            submittedAt: edge.node.submittedAt ?? undefined,
            status: edge.node.status,
            updatedAt: new Date(edge.node.updatedAt),
            submissionType: edge.node.submissionType ?? undefined,
            stateName: edge.node.stateName,
            contractSubmissionType: edge.node.contractSubmissionType,
        }))

    return (
        <section className={styles.panel}>
            <ContractTable
                tableData={submissionRows}
                user={loggedInUser}
                showFilters
            />
        </section>
    )
}

export { SubmissionsDashboard }
