import React from 'react'
import { GridContainer, Icon, SideNav } from '@trussworks/react-uswds'
import styles from './Settings.module.scss'
import { Loading, NavLinkWithLogging } from '../../components'
import { SettingsErrorAlert } from './SettingsErrorAlert'
import { Outlet, useLocation } from 'react-router-dom'
import { recordJSException } from '../../otelHelpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import {
    EmailConfiguration,
    StateAnalystsConfiguration,
    StateAssignment,
    useFetchEmailSettingsQuery,
    useFetchMcReviewSettingsQuery,
} from '../../gen/gqlClient'
import { StateAnalystsInDashboardType } from './SettingsTables/StateAssignmentTable'
import { PageHeadingsRecord, RoutesRecord } from '../../constants'
import { usePage } from '../../contexts/PageContext'

export const TestMonitoring = (): null => {
    const location = useLocation()
    const monitoringTest = new URLSearchParams(location.search).get('test')
    if (monitoringTest) {
        if (monitoringTest === 'crash') {
            throw new Error(
                'This is a force JS error - should catch in error boundary and log to monitoring'
            )
        } else if (monitoringTest === 'error') {
            recordJSException(new Error('Test error logging'))
        }
    }
    return null
}

export const formatEmails = (arr?: string[]) =>
    arr ? arr.join(', ') : 'NOT DEFINED'

const mapStateAnalystsFromParamStore = (
    stateAnalysts?: StateAnalystsConfiguration[] | null
): StateAnalystsInDashboardType[] => {
    return stateAnalysts
        ? stateAnalysts.map((sa) => ({
              emails: sa.emails,
              stateCode: sa.stateCode,
          }))
        : []
}

export type MCReviewSettingsContextType = {
    emailConfig: EmailConfiguration
    stateAnalysts: StateAnalystsInDashboardType[]
}

const mapStateAnalystFromDB = (
    stateAssignments?: StateAssignment[] | null
): StateAnalystsInDashboardType[] => {
    return stateAssignments
        ? stateAssignments.map((state) => ({
              stateCode: state.stateCode,
              emails: state.assignedCMSUsers.map((user) => user.email),
          }))
        : []
}

export const Settings = (): React.ReactElement => {
    const ldClient = useLDClient()
    const { updateHeading } = usePage()

    const readWriteStateAssignments = ldClient?.variation(
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.flag,
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.defaultValue
    )

    updateHeading({
        customHeading: PageHeadingsRecord.MC_REVIEW_SETTINGS,
    })

    const {
        loading: loadEmailSettings,
        data: emailSettingsData,
        error: emailSettingsError,
    } = useFetchEmailSettingsQuery({
        skip: readWriteStateAssignments,
    })
    const {
        loading: loadingMcReviewSettings,
        data: mcrSettingsData,
        error: mcReviewError,
    } = useFetchMcReviewSettingsQuery({
        skip: !readWriteStateAssignments,
    })

    const loadingSettingsData = readWriteStateAssignments
        ? loadingMcReviewSettings
        : loadEmailSettings
    const isSettingsError = readWriteStateAssignments
        ? mcReviewError
        : emailSettingsError

    const emailConfig =
        readWriteStateAssignments && mcrSettingsData
            ? mcrSettingsData.fetchMcReviewSettings.emailConfiguration
            : emailSettingsData?.fetchEmailSettings.config

    let stateAnalysts: StateAnalystsInDashboardType[] = []
    stateAnalysts = readWriteStateAssignments
        ? mapStateAnalystFromDB(
              mcrSettingsData?.fetchMcReviewSettings.stateAssignments
          )
        : mapStateAnalystsFromParamStore(
              emailSettingsData?.fetchEmailSettings.stateAnalysts
          )

    if (loadingSettingsData) return <Loading />

    if (isSettingsError || !emailConfig)
        return <SettingsErrorAlert error={isSettingsError} />

    const context: MCReviewSettingsContextType = {
        emailConfig,
        stateAnalysts,
    }

    return (
        <GridContainer className={styles.outletContainer}>
            <div className={styles.verticalNavContainer}>
                <div className={styles.backLinkContainer}>
                    <NavLinkWithLogging
                        to={{
                            pathname: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        }}
                        event_name="back_button"
                    >
                        <Icon.ArrowBack />
                        <span>&nbsp;Back to dashboard</span>
                    </NavLinkWithLogging>
                </div>
                <SideNav
                    items={[
                        <NavLinkWithLogging to={RoutesRecord.STATE_ASSIGNMENTS}>
                            State assignments
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging
                            to={RoutesRecord.DIVISION_ASSIGNMENTS}
                        >
                            Division assignments
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging to={RoutesRecord.AUTOMATED_EMAILS}>
                            Automated emails
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging to={RoutesRecord.SUPPORT_EMAILS}>
                            Support emails
                        </NavLinkWithLogging>,
                    ]}
                />
            </div>
            <Outlet context={context} />
            <TestMonitoring />
        </GridContainer>
    )
}
