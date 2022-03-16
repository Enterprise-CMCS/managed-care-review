import { GridContainer, Link, Table, Tag } from '@trussworks/react-uswds'
import classnames from 'classnames'
import dayjs from 'dayjs'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { useAuth } from '../../contexts/AuthContext'
import {
    SubmissionType as GQLSubmissionType,
    useIndexSubmissions2Query,
} from '../../gen/gqlClient'
import styles from './Dashboard.module.scss'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
import { base64ToDomain } from '../../common-code/proto/stateSubmission'
import { submissionName } from '../../common-code/domain-models'
import { SubmissionStatusRecord } from '../../constants/submissions'
import {Submission2Status} from '../../common-code/domain-models/Submission2Type'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'

// We only pull a subset of data out of the submission and revisions for display in Dashboard
type SubmissionInDashboard = {
    id: string
    name: string
    programIDs: Array<string>
    submittedAt?: string
    updatedAt: string
    status: Submission2Status
    submissionType: GQLSubmissionType
}

const isSubmitted = (status: Submission2Status) => status === 'SUBMITTED' || status === 'RESUBMITTED'

function submissionURL(
        id: SubmissionInDashboard['id'],
        status: SubmissionInDashboard['status']
    ): string {
        if (status === 'DRAFT') {
            return `/submissions/${id}/type`
        } else if (status === 'UNLOCKED') {
            return `/submissions/${id}/review-and-submit`
        } 
        return `/submissions/${id}`
    }

const StatusTag = ({status} : {status: Submission2Status}): React.ReactElement => {
    const tagStyles = classnames( '', {
        [styles.submittedTag]: isSubmitted(status),
        [styles.draftTag]: status === 'DRAFT',
        [styles.unlockedTag]: status === 'UNLOCKED'
     })
    
    const statusText = isSubmitted(status)? SubmissionStatusRecord.SUBMITTED: SubmissionStatusRecord[status]

    return (
        <Tag
            className={tagStyles}
        >
            {statusText}
        </Tag>
    )
}

export const Dashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()

    const { loading, data, error } = useIndexSubmissions2Query()

    if (error) {
        console.error('Error indexing submissions: ', error)
        return (
            <div id="dashboard-page" className={styles.wrapper}>
                {/*  this div is needed for positioning */}
                <div>
                    <GenericApiErrorBanner message="We're having trouble loading this page. Please refresh your browser and if you continue to experience an error, let us know." />
                </div>
            </div>
        )
    }

    if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
        return <Loading />
    }

    if (loggedInUser.__typename !== 'StateUser') {
        return <div id="dashboard-page" className={styles.wrapper}><div>CMS Users not supported yet.</div> </div>
    }


    const programs = loggedInUser.state.programs
    const submissionRows: SubmissionInDashboard[] = []

    data?.indexSubmissions2.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            const currentRevision = sub.revisions[0]
            const currentSubmissionData = base64ToDomain(
                currentRevision.revision.submissionData
            )
            if (currentSubmissionData instanceof Error) {
                console.error(
                    'ERROR: got a proto decoding error',
                    currentSubmissionData
                )
                return null
            }

            submissionRows.push({
                id: sub.id,
                name: submissionName(currentSubmissionData),
                programIDs: currentSubmissionData.programIDs,
                submittedAt: sub.intiallySubmittedAt,
                status: sub.status,
                updatedAt: currentSubmissionData.updatedAt,
                submissionType: currentSubmissionData.submissionType,
            })
        })

    // Sort by updatedAt for current revision    
    submissionRows.sort((a, b) => (a['updatedAt'] > b['updatedAt'] ? -1 : 1))
     
    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const hasSubmissions = submissionRows.length > 0

    return (
        <>
            <div id="dashboard-page" className={styles.wrapper}>
                <GridContainer
                    className={styles.container}
                    data-testid="dashboard-page"
                >
                    {programs.length ? (
                        <section className={styles.panel}>
                            {justSubmittedSubmissionName && (
                                <SubmissionSuccessMessage
                                    submissionName={justSubmittedSubmissionName}
                                />
                            )}
                            <div className={styles.panelHeader}>
                                <h2>Submissions</h2>
                                <div>
                                    <Link
                                        asCustom={NavLink}
                                        className="usa-button"
                                        variant="unstyled"
                                        to={{
                                            pathname: '/submissions/new',
                                        }}
                                    >
                                        Start new submission
                                    </Link>
                                </div>
                            </div>
                            {hasSubmissions ? (
                                <Table fullWidth>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Programs</th>
                                            <th>Submitted</th>
                                            <th>Last updated</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissionRows.map((dashboardSubmission) => {
                                            return (
                                                <tr key={dashboardSubmission.id}>
                                                    <td data-testid="submission-id">
                                                        <NavLink
                                                            to={submissionURL(
                                                                dashboardSubmission.id,
                                                                dashboardSubmission.status
                                                            )}
                                                        >
                                                            {dashboardSubmission.name}
                                                        </NavLink>
                                                    </td>
                                                    <td>
                                                        {dashboardSubmission.programIDs.map(
                                                            (id) => {
                                                                return (
                                                                    <Tag
                                                                        data-testid="program-tag"
                                                                        key={id}
                                                                        className={`radius-pill ${styles.programTag}`}
                                                                    >
                                                                        {id}
                                                                    </Tag>
                                                                )
                                                            }
                                                        )}
                                                    </td>
                                                    <td data-testid="submission-date">
                                                        {dashboardSubmission.submittedAt
                                                            ? dayjs(
                                                                  dashboardSubmission.submittedAt
                                                              ).format(
                                                                  'MM/DD/YYYY'
                                                              )
                                                            : ''}
                                                    </td>
                                                    <td>
                                                        {dayjs(
                                                            dashboardSubmission.updatedAt
                                                        ).format('MM/DD/YYYY')}
                                                    </td>
                                                    <td data-testid="submission-status">
                                                        <StatusTag status={dashboardSubmission.status} />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className={styles.panelEmpty}>
                                    <h3>You have no submissions yet</h3>
                                </div>
                            )}
                        </section>
                    ) : (
                        <p>No programs exist</p>
                    )}
                </GridContainer>
            </div>
        </>
    )
}
