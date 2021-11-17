import React from 'react'
import dayjs from 'dayjs'
import { Alert, GridContainer, Link, Table, Tag } from '@trussworks/react-uswds'
import { NavLink, useLocation } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Loading } from '../../components/Loading'
import { Tabs } from '../../components/Tabs'
import { TabPanel } from '../../components/Tabs'
import {
    SubmissionCard,
    SubmissionStatus,
    SubmissionType,
} from '../../components/SubmissionCard'
import { useAuth } from '../../contexts/AuthContext'
import { MCRouterState } from '../../constants/routerState'
import {
    IndexSubmissionsQuery,
    Program,
    useIndexSubmissionsQuery,
    SubmissionType as GQLSubmissionType,
} from '../../gen/gqlClient'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
// import { SubmissionType as DomainSubmissionType } from '../../../../app-web/src/common-code/domain-models'

// The SubmissionCard uses some enums, which I think might be a storybook thing but I haven't looked too deeply in it
// so we map our types to the enums.
const domainSubmissionTypeMap: {
    [Property in GQLSubmissionType]: SubmissionType
} = {
    CONTRACT_ONLY: SubmissionType.ContractOnly,
    CONTRACT_AND_RATES: SubmissionType.ContractAndRates,
}

const submissionStatusMap: {
    [key: string]: SubmissionStatus
} = {
    DraftSubmission: SubmissionStatus.draft,
    StateSubmission: SubmissionStatus.submitted,
}

/*
    Note: Program reference is passed within the submission name e.g. AS-TEST-PROGRAM-001
    This means the state program id must match the state program name
    with dashes where there are spaces e.g. {id: test-program, name: 'Test Program'}
*/
const programIDFromSubmissionName = (name: string) =>
    name.split('-').slice(1, -1).join('-').toLowerCase()

const isSubmitted = (typename: string) =>
    typename === 'StateSubmission' ? true : false

// we want all the DraftSubmissions to rise above the StateSubmissions
// but otherwise remain in numeric order  so we can compare their
// typenames to sort them.
export function sortDraftsToTop(
    submissions: { __typename: string; name: string }[],
    justSubmitted: string | undefined
): void {
    submissions.sort((a, b) => {
        // if this one was justSubmitted, float it to the top.
        if (a.name === justSubmitted) {
            return -1
        }
        if (b.name === justSubmitted) {
            return 1
        }
        // 'StateSubmission' > 'DraftSubmission'
        if (a.__typename > b.__typename) {
            return 1
        }
        if (a.__typename < b.__typename) {
            return -1
        }
        return 0
    })
}

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

// the type we get back from indexSubmissions is gnarly, so we just ask for what we need here.
type SubmissionCardInfo = {
    __typename: string
    id: string
    name: string
    programID: string
    submissionType: GQLSubmissionType
    submissionDescription: string
    submittedAt?: Date
}

type TableRow = {
    __typename: string
    id: string
    name: string
    program: Program
    createdAt: string
    updatedAt: string
    submissionType: GQLSubmissionType
}

export const Dashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation<MCRouterState>()

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

    const submissionList = data.indexSubmissions.edges.map((edge) => edge.node)

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    // let defaultTab: string | undefined = undefined
    // if (justSubmittedSubmissionName) {
    //     for (const submission of submissionList) {
    //         if (submission.name === justSubmittedSubmissionName) {
    //             defaultTab = submission.program.name
    //         }
    //     }
    // } else if (location.state && location.state.defaultProgramID) {
    //     const defaultProgram = loggedInUser.state.programs.find(
    //         (program) => program.id === location.state?.defaultProgramID
    //     )
    //     defaultTab = defaultProgram?.name
    // }

    // Go through the list of programs and create a list of submissions in the right order
    const programSubmissions: { [progID: string]: SubmissionCardInfo[] } = {}
    for (const program of programs) {
        const submissions = submissionList.filter(
            (sub) => sub.programID === program.id
        )
        sortDraftsToTop(submissions, justSubmittedSubmissionName ?? undefined)

        programSubmissions[program.id] = submissions
    }

    const hasSubmissions = Object.values(programSubmissions).some(
        (value) => Array.isArray(value) && value.length > 0
    )

    const getFirstProgramName = Object.keys(programSubmissions)[0]

    return (
        <>
            <div className={styles.container} data-testid="dashboard-page">
                {programs.length ? (
                    // <div>
                    //     {programs.map((program: Program) => (
                    // <TabPanel
                    //     key={program.name}
                    //     id={program.name}
                    //     tabName={program.name}
                    // >
                    <GridContainer>
                        {/* {programs.map((program: Program) => ( */}
                        <section
                            // key={program.name}
                            className={styles.panel}
                        >
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
                                            state: {
                                                defaultProgramID:
                                                    getFirstProgramName,
                                            },
                                        }}
                                    >
                                        Start new submission
                                    </Link>
                                </div>
                            </div>
                            {hasSubmissions ? (
                                <Table>
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
                                        {submissionList.map(
                                            (submission: TableRow) => {
                                                return (
                                                    <tr key={submission.id}>
                                                        <td>
                                                            {submission.name}
                                                        </td>
                                                        <td>
                                                            <Tag
                                                                className={`radius-pill ${styles.programTag}`}
                                                            >
                                                                {
                                                                    submission
                                                                        .program
                                                                        .name
                                                                }
                                                            </Tag>
                                                        </td>
                                                        <td>
                                                            {dayjs(
                                                                submission.createdAt
                                                            ).format(
                                                                'MM/DD/YYYY'
                                                            )}
                                                        </td>
                                                        <td>
                                                            {dayjs(
                                                                submission.updatedAt
                                                            ).format(
                                                                'MM/DD/YYYY'
                                                            )}
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
                                // <ul
                                //     id="submissions-list"
                                //     data-testid="submissions-list"
                                //     className="SubmissionCard_submissionList__1okWK"
                                // >
                                //     {programSubmissions[
                                //         program.id
                                //     ].map((submission) => (
                                //         <SubmissionCard
                                //             key={submission.name}
                                //             href={editUrlForSubmission(
                                //                 submission
                                //             )}
                                //             description={
                                //                 submission.submissionDescription
                                //             }
                                //             name={submission.name}
                                //             date={
                                //                 submission.__typename ===
                                //                     'StateSubmission' &&
                                //                 submission.submittedAt
                                //                     ? dayjs(
                                //                           submission.submittedAt
                                //                       )
                                //                     : undefined
                                //             }
                                //             status={
                                //                 submissionStatusMap[
                                //                     submission
                                //                         .__typename
                                //                 ]
                                //             }
                                //             submissionType={
                                //                 domainSubmissionTypeMap[
                                //                     submission
                                //                         .submissionType
                                //                 ]
                                //             }
                                //         />
                                //     ))}
                                // </ul>
                                <div className={styles.panelEmpty}>
                                    <h3>
                                        You have no submissions for{' '}
                                        {getFirstProgramName} yet.
                                    </h3>
                                </div>
                            )}
                        </section>
                        {/* ))} */}
                    </GridContainer>
                ) : (
                    // </TabPanel>
                    //     ))}
                    // </div>
                    <p>No programs exist</p>
                )}
            </div>
        </>
    )
}
