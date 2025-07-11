import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'
import styles from './AppBody.module.scss'
import { AppRoutes } from './AppRoutes'
import { Footer, Header, LinkWithLogging, Loading } from '../../components'
import { AuthModeType } from '@mc-review/common-code'
import { useAuth } from '../../contexts/AuthContext'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { Landing } from '../Landing/Landing'
import { usePageTracing } from '../../hooks/usePageTracing'
import { usePage } from '../../contexts/PageContext'

export function AppBody({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement {
    const [globalAlert, setGlobalAlert] = React.useState<
        React.ReactElement | undefined
    >(undefined)
    const environmentName = import.meta.env.VITE_APP_STAGE_NAME || ''
    const isLowerEnvironment = environmentName !== 'prod'
    const { loginStatus } = useAuth()
    const ldClient = useLDClient()
    const { activeMainContentId } = usePage()

    // Add logging and metrics
    usePageTracing('AppBody')

    const siteUnderMaintenanceBannerFlag: string = ldClient?.variation(
        featureFlags.SITE_UNDER_MAINTENANCE_BANNER.flag,
        featureFlags.SITE_UNDER_MAINTENANCE_BANNER.defaultValue
    )

    const siteUnderMaintenance = siteUnderMaintenanceBannerFlag !== 'OFF'

    return (
        <div id="App" className={styles.app}>
            <LinkWithLogging
                className="usa-skipnav"
                // If an alternate main content is set, we focus that. Usually to skip navigation in main element for
                // accessibility requirements.
                href={activeMainContentId ?? '#main-content'}
            >
                Skip to main content
            </LinkWithLogging>
            <GovBanner aria-label="Official government website" />
            {isLowerEnvironment && (
                <div className={styles.testEnvironmentBanner}>
                    THIS IS A TEST ENVIRONMENT
                </div>
            )}

            <Header
                authMode={authMode}
                setAlert={setGlobalAlert}
                disableLogin={siteUnderMaintenance}
            />
            <main id="main-content" className={styles.mainContent} role="main">
                {globalAlert && globalAlert}
                {siteUnderMaintenance ? (
                    <Landing />
                ) : loginStatus === 'LOADING' ? (
                    <Loading />
                ) : (
                    <AppRoutes authMode={authMode} setAlert={setGlobalAlert} />
                )}
            </main>

            <Footer />
        </div>
    )
}
