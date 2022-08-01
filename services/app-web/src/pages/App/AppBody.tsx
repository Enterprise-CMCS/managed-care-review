import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'
import styles from './AppBody.module.scss'

import { AppRoutes } from './AppRoutes'
import { Footer } from '../../components/Footer'
import { Header } from '../../components/Header'
import { Loading } from '../../components/Loading'
import { useOTEL } from '../../hooks/useOTEL'
import { useTealium } from '../../hooks/useTealium'
import { AuthModeType } from '../../common-code/config'
import { useAuth } from '../../contexts/AuthContext'

export function AppBody({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement {
    const [globalAlert, setGlobalAlert] = React.useState<
        React.ReactElement | undefined
    >(undefined)
    const environmentName = process.env.REACT_APP_STAGE_NAME || ''
    const isLowerEnvironment = environmentName !== 'prod'
    const { loginStatus } = useAuth()

    // Add logging and metrics
    useTealium()
    useOTEL()

    return (
        <div id="App" className={styles.app}>
            <a className="usa-skipnav" href="#main-content">
                Skip to main content
            </a>
            <GovBanner aria-label="Official government website" />
            {isLowerEnvironment && (
                <div className={styles.testEnvironmentBanner}>
                    THIS IS A TEST ENVIRONMENT
                </div>
            )}

            <Header authMode={authMode} setAlert={setGlobalAlert} />
            <main id="main-content" className={styles.mainContent} role="main">
                {globalAlert && globalAlert}
                {loginStatus === 'LOADING' ? (
                    <Loading />
                ) : (
                    <AppRoutes authMode={authMode} setAlert={setGlobalAlert} />
                )}
            </main>

            <Footer />
        </div>
    )
}
