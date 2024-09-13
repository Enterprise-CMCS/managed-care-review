import React from 'react'
import { Grid, GridContainer, Icon, SideNav } from '@trussworks/react-uswds'
import styles from './Settings.module.scss'
import { NavLinkWithLogging } from '../../components'
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
import { ApolloError } from '@apollo/client'

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
              editLink: `/mc-review-settings/state-assignments/${sa.stateCode.toUpperCase()}/edit`,
          }))
        : []
}

export type MCReviewSettingsContextType = {
    emailConfig: {
        data?: EmailConfiguration
        loading: boolean
        error: ApolloError | Error | undefined
    }
    stateAnalysts: {
        data: StateAnalystsInDashboardType[]
        loading: boolean
        error: ApolloError | Error | undefined
    }
}

const mapStateAnalystFromDB = (
    stateAssignments?: StateAssignment[] | null
): StateAnalystsInDashboardType[] => {
    return stateAssignments
        ? stateAssignments.map((state) => ({
              stateCode: state.stateCode,
              emails: state.assignedCMSUsers.map((user) => user.email),
              editLink: `/mc-review-settings/state-assignments/${state.stateCode.toUpperCase()}/edit`,
          }))
        : []
}

export const Settings = (): React.ReactElement => {
    const ldClient = useLDClient()
    const { updateHeading } = usePage()
    const { pathname } = useLocation()

    const readWriteStateAssignments = ldClient?.variation(
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.flag,
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.defaultValue
    )

    updateHeading({
        customHeading: PageHeadingsRecord.MCR_SETTINGS,
    })

    const isSelectedLink = (route: string): string => {
        return route.includes(pathname) ? 'usa-current' : ''
    }

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

    const context: MCReviewSettingsContextType = {
        emailConfig: {
            data: emailConfig ?? undefined,
            loading: loadingSettingsData,
            error:
                isSettingsError || !emailConfig
                    ? new Error(
                          'Request succeed but contained no email settings data'
                      )
                    : undefined,
        },
        stateAnalysts: {
            data: stateAnalysts,
            loading: loadingSettingsData,
            error: isSettingsError,
        },
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
                        <NavLinkWithLogging
                            to={RoutesRecord.STATE_ASSIGNMENTS}
                            className={isSelectedLink(
                                RoutesRecord.STATE_ASSIGNMENTS
                            )}
                        >
                            State assignments
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging
                            to={RoutesRecord.DIVISION_ASSIGNMENTS}
                            className={isSelectedLink(
                                RoutesRecord.DIVISION_ASSIGNMENTS
                            )}
                        >
                            Division assignments
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging
                            to={RoutesRecord.AUTOMATED_EMAILS}
                            className={isSelectedLink(
                                RoutesRecord.AUTOMATED_EMAILS
                            )}
                        >
                            Automated emails
                        </NavLinkWithLogging>,
                        <NavLinkWithLogging
                            to={RoutesRecord.SUPPORT_EMAILS}
                            className={isSelectedLink(
                                RoutesRecord.SUPPORT_EMAILS
                            )}
                        >
                            Support emails
                        </NavLinkWithLogging>,
                    ]}
                />
            </div>
            <Grid className={styles.tableContainer}>
                <Outlet context={context} />
            </Grid>
            <TestMonitoring />
        </GridContainer>
    )
}
