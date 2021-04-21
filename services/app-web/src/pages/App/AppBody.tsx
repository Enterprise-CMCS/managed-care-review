import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'
import styles from './AppBody.module.scss'

import { AppRoutes } from './AppRoutes'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { Loading } from '../../components/Loading'

import { AuthModeType } from '../../common-code/domain-models'
import { useAuth } from '../../contexts/AuthContext'

export function AppBody({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement {
    // TODO: create an DialogContext to handle all app alerts
    const [alert, setAlert] = React.useState<React.ReactElement | undefined>(
        undefined
    )
    const { loginStatus } = useAuth()

    return (
        <div id="App" className={styles.app}>
            <a className="usa-skipnav" href="#main-content">
                Skip to main content
            </a>
            <GovBanner aria-label="Official government website" />

            <Header authMode={authMode} setAlert={setAlert} />
            <main id="main-content" className={styles.mainContent} role="main">
                {alert && alert}
                {loginStatus === 'LOADING' ? (
                    <Loading />
                ) : (
                    <AppRoutes authMode={authMode} />
                )}
            </main>

            <Footer />
        </div>
    )
}
