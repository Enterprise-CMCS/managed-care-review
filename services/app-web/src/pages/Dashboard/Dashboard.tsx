import React from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import { NavLink, useLocation } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Tabs } from '../../components/Tabs/Tabs'
import { TabPanel } from '../../components/Tabs/TabPanel'
import { useAuth } from '../../contexts/AuthContext'
import { Program } from '../../gen/gqlClient'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'

export const Dashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()
    let programs: Program[] = []

    if (loginStatus === 'LOADING' || !loggedInUser) {
        return <div>Loading User Info</div>
    } else {
        programs = loggedInUser.state.programs
    }

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    /* 
        Note: Program reference is passed within the submission name e.g. AS-TEST-PROGRAM-001
        This means the state program id must match the state program name 
        with dashes where there are spaces e.g. {id: test-program, name: 'Test Program'}
    */
    const programIDFromSubmissionName = (name: string) =>
        name.split('-').slice(1, -1).join('-').toLowerCase()

    const ProgramContent = ({
        program,
    }: {
        program: Program
    }): React.ReactElement => {
        return (
            <section key={program.name} className={styles.panel}>
                {justSubmittedSubmissionName &&
                    programIDFromSubmissionName(justSubmittedSubmissionName) ===
                        program.id && (
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
                            to="/submissions/new"
                        >
                            Start new submission
                        </Link>
                    </div>
                </div>
                <div className={styles.panelEmpty}>
                    <h3>You have no submissions yet.</h3>
                </div>
            </section>
        )
    }

    return (
        <>
            <div className={styles.container} data-testid="dashboardPage">
                {programs.length ? (
                    <Tabs className={styles.tabs}>
                        {programs.map((program: Program) => (
                            <TabPanel
                                key={program.name}
                                id={program.name}
                                tabName={program.name}
                            >
                                <GridContainer>
                                    <ProgramContent
                                        key={program.name}
                                        program={program}
                                    />
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
