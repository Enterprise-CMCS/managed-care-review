import { GridContainer, Table, Tag } from '@trussworks/react-uswds'
import classnames from 'classnames'
import dayjs from 'dayjs'
import React from 'react'
import { NavLink } from 'react-router-dom'

import { packageName } from '../../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../../common-code/proto/healthPlanFormDataProto'
import { Loading } from '../../components/Loading'
import {
    SubmissionStatusRecord,
    SubmissionTypeRecord,
} from '../../constants/healthPlanPackages'
import { useAuth } from '../../contexts/AuthContext'
import {
    HealthPlanPackageStatus,
    Program,
    useIndexHealthPlanPackagesQuery,
} from '../../gen/gqlClient'
import { mostRecentDate } from '../../common-code/dateHelpers'
import styles from '../StateDashboard/StateDashboard.module.scss'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import { recordJSException } from '../../otelHelpers/tracingHelper'

// We only pull a subset of data out of the submission and revisions for display in Dashboard
// Depending on submission status, CMS users look at data from current or previous revision
type SubmissionInDashboard = {
    id: string
    name: string
    submittedAt?: string
    updatedAt: Date
    status: HealthPlanPackageStatus
    programs: Program[]
    submissionType: string
    stateName: string
}

const isSubmitted = (status: HealthPlanPackageStatus) =>
    status === 'SUBMITTED' || status === 'RESUBMITTED'

function submissionURL(id: SubmissionInDashboard['id']): string {
    return `/submissions/${id}`
}

const StatusTag = ({
    status,
}: {
    status: HealthPlanPackageStatus
}): React.ReactElement => {
    const tagStyles = classnames('', {
        [styles.submittedTag]: isSubmitted(status),
        [styles.draftTag]: status === 'DRAFT',
        [styles.unlockedTag]: status === 'UNLOCKED',
    })

    const statusText = isSubmitted(status)
        ? SubmissionStatusRecord.SUBMITTED
        : SubmissionStatusRecord[status]

    return <Tag className={tagStyles}>{statusText}</Tag>
}

export const CMSDashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const { loading, data, error } = useIndexHealthPlanPackagesQuery()

    if (error) {
        recordJSException(
            `indexHealthPlanPackagesQuery: Error indexing submissions. Error message:${error.message}`
        )
        return (
            <div id="cms-dashboard-page" className={styles.wrapper}>
                <GridContainer
                    data-testid="cms-dashboard-page"
                    className={styles.container}
                >
                    <GenericApiErrorBanner />
                </GridContainer>
            </div>
        )
    }

    if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
        return <Loading />
    }
    const submissionRows: SubmissionInDashboard[] = []
    data?.indexHealthPlanPackages.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            const currentRevision = sub.revisions[0]
            const currentFormData = base64ToDomain(
                currentRevision.node.formDataProto
            )

            // Errors - data handling
            if (sub.status === 'DRAFT') {
                recordJSException(
                    `indexHealthPlanPackagesQuery: should not return draft submissions for CMS user. ID: ${sub.id}`
                )
                return
            }
            if (currentFormData instanceof Error) {
                recordJSException(
                    `indexHealthPlanPackagesQuery: Error decoding proto. ID: ${sub.id} Error message: ${currentFormData.message}`
                )

                return null
            }

            if (
                currentRevision?.node?.submitInfo?.updatedAt === undefined &&
                currentRevision?.node?.unlockInfo?.updatedAt === undefined
            ) {
                recordJSException(
                    `indexHealthPlanPackagesQuery: Error finding submit and unlock dates for submissions in CMSDashboard. ID: ${sub.id}`
                )
            }

            // Set package display data
            let packageDataToDisplay = currentFormData
            let lastUpdated = mostRecentDate([
                currentRevision?.node?.submitInfo?.updatedAt,
                currentRevision?.node?.unlockInfo?.updatedAt,
            ])

            if (sub.status === 'UNLOCKED') {
                // Errors - data handling
                const previousRevision = sub?.revisions[1]
                const previousFormData = base64ToDomain(
                    previousRevision?.node?.formDataProto
                )
                if (previousFormData instanceof Error) {
                    recordJSException(
                        `indexHealthPlanPackagesQuery: Error decoding proto for display of an unlocked submission. ID: ${sub.id} Error message: ${previousFormData.message}`
                    )

                    return
                }

                if (
                    previousRevision?.node?.submitInfo?.updatedAt ===
                        undefined &&
                    previousRevision?.node?.unlockInfo?.updatedAt === undefined
                ) {
                    recordJSException(
                        `indexHealthPlanPackagesQuery: Error finding submit and unlock dates of an unlocked submission. ID: ${sub.id}`
                    )
                }

                // reset package display data since unlock submissions rely on previous revision data
                packageDataToDisplay = previousFormData
                lastUpdated = mostRecentDate([
                    currentRevision?.node?.submitInfo?.updatedAt,
                    currentRevision?.node?.unlockInfo?.updatedAt,
                    previousRevision?.node?.submitInfo?.updatedAt,
                    previousRevision?.node?.unlockInfo?.updatedAt,
                ])
            }

            if (!lastUpdated) {
                recordJSException(
                    `CMSDashboard: Cannot find valid last updated date from submit and unlock info. Falling back to current revision's last edit timestamp. ID: ${sub.id}`
                )
                lastUpdated = new Date(currentFormData.updatedAt)
            }
            const programs = sub.state.programs

            submissionRows.push({
                id: sub.id,
                name: packageName(packageDataToDisplay, programs),
                programs: programs.filter((program) =>
                    packageDataToDisplay.programIDs.includes(program.id)
                ),
                submittedAt: sub.initiallySubmittedAt,
                status: sub.status,
                updatedAt: lastUpdated,
                submissionType:
                    SubmissionTypeRecord[packageDataToDisplay.submissionType],
                stateName: sub.state.name,
            })
        })

    // Sort rows by the CMS updatedAt date
    submissionRows.sort((a, b) => (a['updatedAt'] > b['updatedAt'] ? -1 : 1))
    const hasSubmissions = submissionRows.length > 0

    return (
        <>
            <div id="cms-dashboard-page" className={styles.wrapper}>
                <GridContainer
                    className={styles.container}
                    data-testid="cms-dashboard-page"
                >
                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Submissions</h2>
                        </div>
                        {hasSubmissions ? (
                            <Table fullWidth>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>State</th>
                                        <th>Submission type</th>
                                        <th>Programs</th>
                                        <th>Submission date</th>
                                        <th>Last updated</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissionRows.map(
                                        (dashboardSubmission) => {
                                            return (
                                                <tr
                                                    data-testid={`row-${dashboardSubmission.id}`}
                                                    key={dashboardSubmission.id}
                                                >
                                                    <td data-testid="submission-id">
                                                        <NavLink
                                                            to={submissionURL(
                                                                dashboardSubmission.id
                                                            )}
                                                        >
                                                            {
                                                                dashboardSubmission.name
                                                            }
                                                        </NavLink>
                                                    </td>
                                                    <td data-testid="submission-stateName">
                                                        <span>
                                                            {
                                                                dashboardSubmission.stateName
                                                            }
                                                        </span>
                                                    </td>
                                                    <td data-testid="submission-type">
                                                        <span>
                                                            {
                                                                dashboardSubmission.submissionType
                                                            }
                                                        </span>
                                                    </td>
                                                    <td data-testid="submission-programs">
                                                        {dashboardSubmission.programs.map(
                                                            (program) => {
                                                                return (
                                                                    <Tag
                                                                        data-testid="program-tag"
                                                                        key={
                                                                            program.id
                                                                        }
                                                                        className={`radius-pill ${styles.programTag}`}
                                                                    >
                                                                        {
                                                                            program.name
                                                                        }
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
                                                    <td data-testid="submission-last-updated">
                                                        {dashboardSubmission.updatedAt
                                                            ? dayjs(
                                                                  dashboardSubmission.updatedAt
                                                              )
                                                                  .tz('UTC')
                                                                  .format(
                                                                      'MM/DD/YYYY'
                                                                  )
                                                            : ''}
                                                    </td>
                                                    <td data-testid="submission-status">
                                                        <StatusTag
                                                            status={
                                                                dashboardSubmission.status
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    )}
                                </tbody>
                            </Table>
                        ) : (
                            <div
                                data-testid="cms-dashboard-page"
                                className={styles.panelEmpty}
                            >
                                <h3>You have no submissions yet</h3>
                            </div>
                        )}
                    </section>
                </GridContainer>
            </div>
        </>
    )
}
