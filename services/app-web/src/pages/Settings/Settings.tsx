import React, { useState, useEffect } from 'react'
import { Grid, GridContainer, Icon, SideNav } from '@trussworks/react-uswds'
import styles from './Settings.module.scss'
import { NavLinkWithLogging } from '../../components'
import { Outlet, useLocation } from 'react-router-dom'
import { recordJSException } from '@mc-review/otel'
import {
    EmailConfiguration,
    StateAssignment,
    useFetchMcReviewSettingsQuery,
} from '../../gen/gqlClient'
import { StateAnalystsInDashboardType } from './SettingsTables'
import { RoutesRecord } from '@mc-review/constants'
import { ApolloError } from '@apollo/client'
import { AssignedStaffUpdateBanner } from '../../components/Banner/AssignedStaffUpdateBanner/AssignedStaffUpdateBanner'
import { useCurrentRoute } from '../../hooks'
import { SETTINGS_HIDE_SIDEBAR_ROUTES } from '@mc-review/constants'
import { useAuth } from '../../contexts/AuthContext'

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

export type LastUpdatedAnalystsType = {
    state: string
    removed: string[] // full name string - passed from formik label in EditStateAssign
    added: string[] // full name string - passed from formik label in EditStateAssign
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
        lastUpdated: LastUpdatedAnalystsType | null
        setLastUpdated: React.Dispatch<
            React.SetStateAction<LastUpdatedAnalystsType | null>
        >
    }
}

const mapStateAnalystFromDB = (
    stateAssignments?: StateAssignment[] | null
): StateAnalystsInDashboardType[] => {
    return stateAssignments
        ? stateAssignments.map((state) => ({
              stateCode: state.stateCode,
              stateName: state.name,
              analysts: state.assignedCMSUsers.map((user) => {
                  return {
                      givenName: user.givenName,
                      familyName: user.familyName,
                      email: user.email,
                  }
              }),
              editLink: `/mc-review-settings/state-assignments/${state.stateCode.toUpperCase()}/edit`,
          }))
        : []
}

export const Settings = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const { currentRoute } = useCurrentRoute()
    const { pathname } = useLocation()
    const [lastUpdatedAnalysts, setLastUpdatedAnalysts] =
        useState<LastUpdatedAnalystsType | null>(null)

    // determine if we should display a recent submit success banner
    const submitType = new URLSearchParams(location.search).get('submit')
    const showAnalystsUpdatedBanner = submitType == 'state-assignments'

    const isSelectedLink = (route: string): string => {
        return route.includes(pathname) ? 'usa-current' : ''
    }

    const {
        loading,
        data,
        error,
        refetch: refetchMcReviewSettings,
    } = useFetchMcReviewSettingsQuery({
        notifyOnNetworkStatusChange: true,
    })

    // Refetch all data in background if there's been recent update

    useEffect(() => {
        if (showAnalystsUpdatedBanner) {
            // right now we only have one case of setting data that can change in the background (assigned analysts)
            // this refetch data will just rerender data when available, no loading state currently since changes are likely very small
            void refetchMcReviewSettings()
        }
    }, [showAnalystsUpdatedBanner, refetchMcReviewSettings])

    const emailConfig = data?.fetchMcReviewSettings.emailConfiguration

    const stateAnalysts: StateAnalystsInDashboardType[] = mapStateAnalystFromDB(
        data?.fetchMcReviewSettings.stateAssignments
    )

    const context: MCReviewSettingsContextType = {
        emailConfig: {
            data: emailConfig ?? undefined,
            loading: loading,
            error:
                error || !emailConfig
                    ? new Error(
                          'Request succeed but contained no email settings data'
                      )
                    : undefined,
        },
        stateAnalysts: {
            data: stateAnalysts,
            loading: loading,
            error: error,
            lastUpdated: lastUpdatedAnalysts,
            setLastUpdated: (analysts) => {
                setLastUpdatedAnalysts(analysts)
            },
        },
    }

    const showConfirmationBanner =
        showAnalystsUpdatedBanner && lastUpdatedAnalysts && !loading

    if (SETTINGS_HIDE_SIDEBAR_ROUTES.includes(currentRoute)) {
        return <Outlet context={context} />
    }

    return (
        <div className={styles.background}>
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
                            isAdminUser && (
                                <NavLinkWithLogging
                                    to={RoutesRecord.OAUTH_CLIENTS}
                                    className={isSelectedLink(
                                        RoutesRecord.OAUTH_CLIENTS
                                    )}
                                >
                                    Oauth clients
                                </NavLinkWithLogging>
                            ),
                        ]}
                    />
                </div>
                <Grid className={styles.tableContainer}>
                    {showConfirmationBanner && (
                        <AssignedStaffUpdateBanner
                            state={lastUpdatedAnalysts.state}
                            added={lastUpdatedAnalysts.added}
                            removed={lastUpdatedAnalysts.removed}
                        />
                    )}
                    <Outlet context={context} />
                </Grid>
                <TestMonitoring />
            </GridContainer>
        </div>
    )
}
