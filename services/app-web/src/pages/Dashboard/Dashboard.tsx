import React from 'react'
import dayjs from 'dayjs'
import { GridContainer, Link, Alert } from '@trussworks/react-uswds'
import { NavLink, useLocation } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Loading } from '../../components/Loading'
import { Tabs } from '../../components/Tabs/Tabs'
import { TabPanel } from '../../components/Tabs/TabPanel'
import {
    SubmissionCard,
    SubmissionStatus,
    SubmissionType,
} from '../../components/SubmissionCard/SubmissionCard'
import { useAuth } from '../../contexts/AuthContext'
import { MCRouterState } from '../../constants/routerState'
import { Program, useIndexSubmissionsQuery } from '../../gen/gqlClient'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
import { SubmissionType as DomainSubmissionType } from '../../../../app-web/src/common-code/domain-models'

// The SubmissionCard uses some enums, which I think might be a storybook think but I haven't looked too deeply in it
// so we map our types to the enums.
const domainSubmissionTypeMap: {
    [Property in DomainSubmissionType]: SubmissionType
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
    submissionType: DomainSubmissionType
    submissionDescription: string
    submittedAt?: Date
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

    let defaultTab: string | undefined = undefined
    if (justSubmittedSubmissionName) {
        for (const submission of submissionList) {
            if (submission.name === justSubmittedSubmissionName) {
                defaultTab = submission.program.name
            }
        }
    } else if (location.state && location.state.defaultProgramID) {
        const defaultProgram = loggedInUser.state.programs.find(
            (program) => program.id === location.state?.defaultProgramID
        )
        defaultTab = defaultProgram?.name
    }

    // Go through the list of programs and create a list of submissions in the right order
    const programSubmissions: { [progID: string]: SubmissionCardInfo[] } = {}
    for (const program of programs) {
        const submissions = submissionList.filter(
            (sub) => sub.programID === program.id
        )
        sortDraftsToTop(submissions, justSubmittedSubmissionName ?? undefined)

        programSubmissions[program.id] = submissions
    }

    return (
        <>
            <div className={styles.container} data-testid="dashboard-page">
                {programs.length ? (
                    <Tabs className={styles.tabs} defaultActiveTab={defaultTab}>
                        {programs.map((program: Program) => (
                            <TabPanel
                                key={program.name}
                                id={program.name}
                                tabName={program.name}
                            >
                                <GridContainer>
                                    <section
                                        key={program.name}
                                        className={styles.panel}
                                    >
                                        {justSubmittedSubmissionName &&
                                            programIDFromSubmissionName(
                                                justSubmittedSubmissionName
                                            ) === program.id && (
                                                <SubmissionSuccessMessage
                                                    submissionName={
                                                        justSubmittedSubmissionName
                                                    }
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
                                                        pathname:
                                                            '/submissions/new',
                                                        state: {
                                                            defaultProgramID:
                                                                program.id,
                                                        },
                                                    }}
                                                >
                                                    Start new submission
                                                </Link>
                                            </div>
                                        </div>
                                        {programSubmissions[program.id].length >
                                        0 ? (
                                            <ul
                                                id="submissions-list"
                                                data-testid="submissions-list"
                                                className="SubmissionCard_submissionList__1okWK"
                                            >
                                                {programSubmissions[
                                                    program.id
                                                ].map((submission) => (
                                                    <SubmissionCard
                                                        key={submission.name}
                                                        href={editUrlForSubmission(
                                                            submission
                                                        )}
                                                        description={
                                                            submission.submissionDescription
                                                        }
                                                        name={submission.name}
                                                        date={
                                                            submission.__typename ===
                                                                'StateSubmission' &&
                                                            submission.submittedAt
                                                                ? dayjs(
                                                                      submission.submittedAt
                                                                  )
                                                                : undefined
                                                        }
                                                        status={
                                                            submissionStatusMap[
                                                                submission
                                                                    .__typename
                                                            ]
                                                        }
                                                        submissionType={
                                                            domainSubmissionTypeMap[
                                                                submission
                                                                    .submissionType
                                                            ]
                                                        }
                                                    />
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className={styles.panelEmpty}>
                                                <h3>
                                                    You have no submissions for{' '}
                                                    {program.name} yet.
                                                </h3>
                                            </div>
                                        )}
                                    </section>
                                </GridContainer>
                            </TabPanel>
                        ))}
                    </Tabs>
                ) : (
                    <p>No programs exist</p>
                )}
            </div>
        </>
    )
}
