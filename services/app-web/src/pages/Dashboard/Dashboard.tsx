import { GridContainer, Link, FileInput } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import styles from './Dashboard.module.scss'

import { Tabs } from '../../components/Tabs/Tabs'
import { TabPanel } from '../../components/Tabs/TabPanel'
import { useAuth } from '../../contexts/AuthContext'
import { Program } from '../../gen/gqlClient'

import AWS from 'aws-sdk'
import { s3LocalUploader } from '../../api/s3Local'

// Local s3
const localEndpoint = 'http://localhost:4569'
const s3Client = new AWS.S3({
    s3ForcePathStyle: true,
    apiVersion: '2006-03-01',
    accessKeyId: 'S3RVER', // This specific key is required when working offline
    secretAccessKey: 'S3RVER',
    params: { Bucket: 'local-uploads' },
    endpoint: new AWS.Endpoint(localEndpoint),
})
const s3Upload = s3LocalUploader(s3Client)
// const s3URLResolver = s3LocalGetURL(s3Client)

export const Dashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    let programs: Program[] = []

    if (loginStatus === 'LOADING' || !loggedInUser) {
        return <div>Loading User Info</div>
    } else {
        programs = loggedInUser.state.programs
    }

    const handleOnChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log(e)
        if (e.currentTarget.files === null) return
        try {
            await s3Upload(e.currentTarget.files[0])
        } catch (error) {
            console.log('S3 error', error)
        }
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

                                <FileInput
                                    id="test"
                                    name="test"
                                    onChange={handleOnChange}
                                />
                            </GridContainer>
                        </TabPanel>
                    ))}
                </Tabs>
            ) : (
                <p>No programs exist</p>
            )}
        </div>
    )
}
