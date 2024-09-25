import React, {useState, useEffect} from 'react'
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
import { StateAnalystsInDashboardType} from './SettingsTables/StateAssignmentTable'
import { PageHeadingsRecord, RoutesRecord } from '../../constants'
import { usePage } from '../../contexts/PageContext'
import { ApolloError } from '@apollo/client'
import { AssignedStaffUpdateBanner } from '../../components/Banner/AssignedStaffUpdateBanner/AssignedStaffUpdateBanner'
import { useCurrentRoute } from '../../hooks'
import { SETTINGS_HIDE_SIDEBAR_ROUTES } from '../../constants/routes'

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

const mapStateAnalystsFromParamStore = (
    stateAnalysts?: StateAnalystsConfiguration[] | null
): StateAnalystsInDashboardType[] => {
    return stateAnalysts
        ? stateAnalysts.map((sa) => ({
              analysts: sa.emails.map( (email) => { return {givenName: 'N/A', familyName: 'N/A', email} }), // not given or family names because parameter store cannot guarantee this context
              stateCode: sa.stateCode,
              stateName: 'Unknown state',
              editLink: `/mc-review-settings/state-assignments/${sa.stateCode.toUpperCase()}/edit`,
          }))
        : []
}

export type LastUpdatedAnalystsType = {
        state: string,
        removed:  string[], // full name string - passed from formik label in EditStateAssign
        added: string[]// full name string - passed from formik label in EditStateAssign
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
        setLastUpdated: React.Dispatch<React.SetStateAction<LastUpdatedAnalystsType | null>>
    }
}

const mapStateAnalystFromDB = (
    stateAssignments?: StateAssignment[] | null
): StateAnalystsInDashboardType[] => {
    return stateAssignments
        ? stateAssignments.map((state) => ({
              stateCode: state.stateCode,
              stateName: state.name,
              analysts: state.assignedCMSUsers.map((user) => {return { givenName: user.givenName, familyName: user.familyName, email: user.email}}),
              editLink: `/mc-review-settings/state-assignments/${state.stateCode.toUpperCase()}/edit`,
          }))
        : []
}

export const Settings = (): React.ReactElement => {
    const ldClient = useLDClient()
    const { updateHeading } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { pathname } = useLocation()
    const [ lastUpdatedAnalysts, setLastUpdatedAnalysts] = useState<LastUpdatedAnalystsType |null>(null)
    const readWriteStateAssignments = ldClient?.variation(
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.flag,
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.defaultValue
    )

    // determine if we should display a recent submit success banner
    const submitType = new URLSearchParams(location.search).get('submit')
    const showAnalystsUpdatedBanner = readWriteStateAssignments && submitType == 'state-assignments'

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
        refetch: refetchMcReviewSettings
    } = useFetchMcReviewSettingsQuery({
        skip: !readWriteStateAssignments,
        notifyOnNetworkStatusChange: true,
    })

    useEffect(()=> {
       void refetchMcReviewSettings()
    }, [currentRoute, refetchMcReviewSettings])

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
            lastUpdated: lastUpdatedAnalysts,
            setLastUpdated: (analysts) => {setLastUpdatedAnalysts(analysts)},
        },
    }

    if(SETTINGS_HIDE_SIDEBAR_ROUTES.includes(currentRoute)){
        return <Outlet context={context} />
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
                {showAnalystsUpdatedBanner && lastUpdatedAnalysts && <AssignedStaffUpdateBanner state={lastUpdatedAnalysts.state} added={lastUpdatedAnalysts.added} removed={lastUpdatedAnalysts.removed} />}
                <Outlet context={context} />
            </Grid>
            <TestMonitoring />
        </GridContainer>
    )
}
