import React, { useState } from 'react'
import dayjs from 'dayjs'
import { Alert, GridContainer, Link, Table, Tag } from '@trussworks/react-uswds'
import { NavLink, useLocation } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Loading } from '../../components/Loading'
import { useAuth } from '../../contexts/AuthContext'
import {
    useIndexSubmissionsQuery,
    SubmissionType as GQLSubmissionType,
} from '../../gen/gqlClient'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'

const isSubmitted = (typename: string) =>
    typename === 'StateSubmission' ? true : false

function editUrlForSubmission(submission: {
    __typename: string
    id: string
}): string {
    // go to the edit URLS
    if (submission.__typename === 'DraftSubmission') {
        return `/submissions/${submission.id}/type`
    }
    return `/submissions/${submission.id}`
}

type TableRow = {
    __typename: string
    id: string
    name: string
    programIDs: Array<string>
    submittedAt?: string
    updatedAt: string
    submissionType: GQLSubmissionType
}

export const Dashboard = (): React.ReactElement => {
    // add a setSortColumn function once we implement sorting--and then delete this comment :-)
    // <Partial<keyof TableRow>> tells the compiler "any of the keys of TableRow is acceptable"
    const [sortColumn] = useState<Partial<keyof TableRow>>('updatedAt')
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()

    const { loading, data, error } = useIndexSubmissionsQuery()

    if (error) {
        console.log('error loading submissions', error)
        return (
            <Alert type="error">
                Unexpected Error loading your submissions, please try again.
            </Alert>
        )
    }

    if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
        return <Loading />
    }

    if (loggedInUser.__typename !== 'StateUser') {
        return <div>CMS Users not supported yet.</div>
    }

    const programs = loggedInUser.state.programs

    const submissionRows = data.indexSubmissions.edges
        .map((edge) => edge.node)
        .map((row) => {
            if (row.__typename === 'DraftSubmission') {
                return {
                    __typename: row.__typename,
                    id: row.id,
                    name: row.name,
                    programIDs: row.programIDs,
                    updatedAt: row.updatedAt,
                    submissionType: row.submissionType,
                }
            } else {
                return {
                    __typename: row.__typename,
                    id: row.id,
                    name: row.name,
                    programIDs: row.programIDs,
                    submittedAt: row.submittedAt,
                    updatedAt: row.updatedAt,
                    submissionType: row.submissionType,
                }
            }
        })
        .sort((a, b) => (a[sortColumn] > b[sortColumn] ? -1 : 1))

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const hasSubmissions = submissionRows.length > 0

    return (
        <>
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
                                    {submissionRows.map(
                                        (submission: TableRow) => {
                                            return (
                                                <tr key={submission.id}>
                                                    <td data-testid="submission-id">
                                                        <NavLink
                                                            to={editUrlForSubmission(
                                                                submission
                                                            )}
                                                        >
                                                            {submission.name}
                                                        </NavLink>
                                                    </td>
                                                    <td>
                                                        {submission.programIDs.map(
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
                                                        {submission.submittedAt
                                                            ? dayjs(
                                                                  submission.submittedAt
                                                              ).format(
                                                                  'MM/DD/YYYY'
                                                              )
                                                            : ''}
                                                    </td>
                                                    <td>
                                                        {dayjs(
                                                            submission.updatedAt
                                                        ).format('MM/DD/YYYY')}
                                                    </td>
                                                    <td>
                                                        <Tag
                                                            className={
                                                                isSubmitted(
                                                                    submission.__typename
                                                                )
                                                                    ? styles.submittedTag
                                                                    : styles.draftTag
                                                            }
                                                        >
                                                            {isSubmitted(
                                                                submission.__typename
                                                            )
                                                                ? 'Submitted'
                                                                : 'Draft'}
                                                        </Tag>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    )}
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
        </>
    )
}
