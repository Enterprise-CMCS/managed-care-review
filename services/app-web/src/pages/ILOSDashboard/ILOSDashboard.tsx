import React from 'react'
import { useQuery } from '@apollo/client/react'
import { handleApolloError, isLikelyUserAuthError } from '@mc-review/helpers'
import { recordJSException } from '@mc-review/otel'
import { useAuth } from '../../contexts/AuthContext'
import { IndexIlosSubmissionsStrippedDocument } from '../../gen/gqlClient'
import { usePageLoadSpan } from '../../hooks'
import {
    ErrorAlertSignIn,
    GenericApiErrorBanner,
    ILOSSubmissionInDashboardType,
    ILOSTable,
    Loading,
} from '../../components'
import { ErrorFailedRequestPage } from '../Errors/ErrorFailedRequestPage'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import styles from '../StateDashboard/StateDashboard.module.scss'

const ILOSDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const isStateUser = loggedInUser?.__typename === 'StateUser'
    const { data, loading, error } = useQuery(
        IndexIlosSubmissionsStrippedDocument,
        {
            fetchPolicy: 'cache-and-network',
            pollInterval: 120000,
        }
    )

    // Measure dashboard load time (mount -> data ready) for the ILOS tab.
    usePageLoadSpan({
        // Explicit id: DASHBOARD_ILOS serves both the state and the CMS dashboard,
        // so the route alone can't identify which one was loaded.
        pageName: isStateUser ? 'state-dashboard-ilos' : 'cms-dashboard-ilos',
        ready: !!data,
        error,
        attributes: {
            'dashboard.tab': 'ilos',
            'dashboard.row_count':
                data?.indexIlosSubmissionsStripped.edges.length ?? 0,
        },
    })

    // Memoized so the table rows keep their identity when the tab renders again with the same data.
    const ilosRows = React.useMemo(() => {
        const rows: ILOSSubmissionInDashboardType[] = []
        const edges = data?.indexIlosSubmissionsStripped.edges ?? []
        edges
            .map((edge) => edge.node)
            .forEach((sub) => {
                // A state user works from the draft revision until the ILOS submission is submitted.
                // Every other user only ever sees submitted data.
                const isSubmitted =
                    sub.status === 'SUBMITTED' || sub.status === 'RESUBMITTED'
                const currentRevision =
                    isStateUser && !isSubmitted
                        ? sub.draftRevision
                        : sub.latestSubmittedRevision

                if (!currentRevision) {
                    recordJSException(
                        `indexIlosSubmissionsStripped: ILOS submission with ID ${sub.id} and status ${sub.status} did not contain the revision to display`
                    )
                    return
                }

                rows.push({
                    id: sub.id,
                    name: currentRevision.contractName,
                    stateName: sub.state.name,
                    rateDateStart:
                        currentRevision.formData.ilosRateDateStart ?? undefined,
                    rateDateEnd:
                        currentRevision.formData.ilosRateDateEnd ?? undefined,
                    submittedAt: sub.initiallySubmittedAt,
                    status: sub.consolidatedStatus,
                })
            })
        return rows
    }, [data, isStateUser])

    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        // The state dashboard keeps its heading above the tabs, so a state user gets a banner
        // in the tab, as on All submissions. The error page has a page heading of its own.
        if (isStateUser) {
            handleApolloError(error, true)
            return isLikelyUserAuthError(error, true) ? (
                <ErrorAlertSignIn />
            ) : (
                <GenericApiErrorBanner />
            )
        }
        return <ErrorFailedRequestPage error={error} testID="ilos-dashboard" />
    } else if (!data || !loggedInUser) {
        return <GenericErrorPage />
    }

    return (
        <section className={styles.panel}>
            <h2
                className="margin-top-0 margin-bottom-3"
                data-testid="ilos-dashboard-heading"
            >
                ILOS actuarial reports
            </h2>
            <ILOSTable tableData={ilosRows} user={loggedInUser} />
        </section>
    )
}

export { ILOSDashboard }
