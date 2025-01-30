import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Table, GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { Loading, Tabs, TabPanel } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { EditLink, parseEmailData } from '../SettingsCells/SettingsCells'
import styles from '../../StateDashboard/StateDashboard.module.scss'

const AutomatedEmailsTable = () => {
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()

    if (config.loading) return <Loading />

    if (config.error) return <SettingsErrorAlert error={config.error} />

    const DMCOEmails =
        config?.data?.dmcoEmails && parseEmailData(config.data.dmcoEmails)
    const DMCPRevEmails =
        config?.data?.dmcpReviewEmails &&
        parseEmailData(config.data.dmcpReviewEmails)
    const DMCPSubEmails =
        config?.data?.dmcpSubmissionEmails &&
        parseEmailData(config.data.dmcpSubmissionEmails)
    const OACTEmails =
        config?.data?.dmcoEmails && parseEmailData(config.data.dmcoEmails)
    const DEVEmails =
        config?.data?.dmcoEmails &&
        parseEmailData(config.data.devReviewTeamEmails)

    const TAB_NAMES = {
        DMCO: 'DMCO',
        DMCP: 'DMCP',
        OACT: 'OACT',
        DEV: 'DEV',
    }

    return (
        <>
            <h2>Automated emails</h2>
            <p>
                Shared inboxes receive emails for different submissions, as
                described below.
            </p>
            <div className={styles.wrapper}>
                <GridContainer className={styles.container}>
                    <section className={styles.panel}>
                        <Tabs
                            defaultActiveTab={TAB_NAMES.DMCO}
                            className={styles.tabs}
                        >
                            <TabPanel id="submissions" tabName={TAB_NAMES.DMCO}>
                                <h4>DMCO division emails</h4>
                                <Table bordered>
                                    <caption className="srOnly">
                                        DMCO emails
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Edit Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DMCOEmails?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.email}</td>
                                                <td>
                                                    <EditLink
                                                        url={`${item.email}/edit`}
                                                        fieldName={item.name}
                                                        rowID={item.email}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TabPanel>

                            <TabPanel
                                id="rate-reviews"
                                tabName={TAB_NAMES.DMCP}
                            >
                                <h3>DMCP division emails used for reviews</h3>
                                <p>
                                    All submissions; excluding CHIP programs and
                                    PR state
                                </p>
                                <Table bordered>
                                    <caption className="srOnly">
                                        DMCP review emails
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Edit Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DMCPRevEmails?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.email}</td>
                                                <td>
                                                    <EditLink
                                                        url={`${item.email}/edit`}
                                                        fieldName={item.name}
                                                        rowID={item.email}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                <h3>
                                    DMCP division emails used for submissions
                                </h3>
                                <p>
                                    All submissions; excluding CHIP programs and
                                    PR state
                                </p>
                                <Table bordered>
                                    <caption className="srOnly">
                                        DMCP submission emails
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Edit Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DMCPSubEmails?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.email}</td>
                                                <td>
                                                    <EditLink
                                                        url={`${item.email}/edit`}
                                                        fieldName={item.name}
                                                        rowID={item.email}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TabPanel>
                            <TabPanel
                                id="rate-reviews"
                                tabName={TAB_NAMES.OACT}
                            >
                                <h3>OACT division emails</h3>
                                <p>
                                    Contract and rate submissions; excluding
                                    CHIP programs, PR state and non risked based
                                    contraction
                                </p>
                                <Table bordered>
                                    <caption className="srOnly">
                                        OACT emails
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Edit Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {OACTEmails?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.email}</td>
                                                <td>
                                                    <EditLink
                                                        url={`${item.email}/edit`}
                                                        fieldName={item.name}
                                                        rowID={item.email}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TabPanel>
                            <TabPanel id="rate-reviews" tabName={TAB_NAMES.DEV}>
                                <h3>Dev emails</h3>
                                <p>All emails (from CMS side and state side)</p>
                                <Table bordered>
                                    <caption className="srOnly">
                                        Dev emails
                                    </caption>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Edit Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DEVEmails?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td>{item.email}</td>
                                                <td>
                                                    <EditLink
                                                        url={`${item.email}/edit`}
                                                        fieldName={item.name}
                                                        rowID={item.email}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </TabPanel>
                        </Tabs>
                    </section>
                </GridContainer>
            </div>
        </>
    )
}

export { AutomatedEmailsTable }
