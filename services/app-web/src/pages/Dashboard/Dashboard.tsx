import { GridContainer, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Tabs } from '../../components/Tabs/Tabs'
import { TabPanel } from '../../components/Tabs/TabPanel'
import { useAuth } from '../../contexts/AuthContext'
import { Program } from '../../gen/gqlClient'

export const Dashboard = (): React.ReactElement => {
    const { isLoading, loggedInUser } = useAuth()
    let programs: Program[] = []

    if (isLoading || !loggedInUser) {
        return <div>Loading User Info</div>
    } else {
        programs = loggedInUser.state.programs
    }

    const ProgramContent = ({
        program,
    }: {
        program: Program
    }): React.ReactElement => {
        return (
            <section key={program.name} className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2>Submissions</h2>
                    <div>
                        <Link
                            asCustom={NavLink}
                            className="usa-button"
                            variant="unstyled"
                            to="/new"
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
        <GridContainer className={styles.container} data-testid="dashboardPage">
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
        </GridContainer>
    )
}
