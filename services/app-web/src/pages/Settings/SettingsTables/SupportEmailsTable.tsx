import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { Loading, Tabs, TabPanel, DataDetail } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import styles from '../../StateDashboard/StateDashboard.module.scss'
import { parseEmailData } from '../SettingsCells/SettingsCells'

const SupportEmailsTable = () => {
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()

    if (config.loading) return <Loading />

    if (config.error || !config.data)
        return <SettingsErrorAlert error={config.error} />

    const TAB_NAMES = {
        MCREVIEW: 'MC-Review',
        CONTRACTS: 'Contracts',
        Rates: 'Rates',
    }

    const mcReviewHelpEmail = parseEmailData(config?.data?.helpDeskEmail)[0]
    const contractHelpEmail = parseEmailData(
        config?.data?.cmsReviewHelpEmailAddress
    )[0]
    const ratesHelpEmail = parseEmailData(
        config?.data?.cmsRateHelpEmailAddress
    )[0]

    // const MCReviewEmail = config?.data?.helpDeskEmail && parseEmailData(config.data.helpDeskEmail)
    // eslint-disable-next-line no-console
    console.log(parseEmailData(config?.data?.helpDeskEmail))

    return (
        <>
            <h2>Support emails</h2>
            <p>
                States that need support should contact one of these email
                addresses, depending on the issue.
            </p>
            <p>States see these addresses in submission-related emails.</p>
            <div className={styles.wrapper}>
                <GridContainer className={styles.container}>
                    <section className={styles.panel}>
                        <Tabs
                            defaultActiveTab={TAB_NAMES.MCREVIEW}
                            className={styles.tabs}
                        >
                            <TabPanel
                                id="mc-review"
                                tabName={TAB_NAMES.MCREVIEW}
                            >
                                <DataDetail id="inbox" label="Inbox">
                                    {mcReviewHelpEmail.name}
                                </DataDetail>

                                <DataDetail id="email" label="Email">
                                    {mcReviewHelpEmail.email}
                                </DataDetail>

                                <DataDetail id="type" label="Type">
                                    Help desk email
                                </DataDetail>

                                <DataDetail
                                    id="description"
                                    label="Description"
                                >
                                    For general MC-Review application support
                                </DataDetail>
                            </TabPanel>

                            <TabPanel
                                id="contracts"
                                tabName={TAB_NAMES.CONTRACTS}
                            >
                                <DataDetail id="inbox" label="Inbox">
                                    {contractHelpEmail.name}
                                </DataDetail>

                                <DataDetail id="email" label="Email">
                                    {contractHelpEmail.email}
                                </DataDetail>

                                <DataDetail id="type" label="Type">
                                    Contract help email
                                </DataDetail>

                                <DataDetail
                                    id="description"
                                    label="Description"
                                >
                                    For contract-related support
                                </DataDetail>
                            </TabPanel>

                            <TabPanel id="rates" tabName={TAB_NAMES.Rates}>
                                <DataDetail id="inbox" label="Inbox">
                                    {ratesHelpEmail.name}
                                </DataDetail>

                                <DataDetail id="email" label="Email">
                                    {ratesHelpEmail.email}
                                </DataDetail>

                                <DataDetail id="type" label="Type">
                                    Rate help email
                                </DataDetail>

                                <DataDetail
                                    id="description"
                                    label="Description"
                                >
                                    For rate-related support
                                </DataDetail>
                            </TabPanel>
                        </Tabs>
                    </section>
                </GridContainer>
            </div>
        </>
    )
}

export { SupportEmailsTable }
