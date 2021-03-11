import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'

import styles from './AppBody.module.scss'

import { AppRoutes } from './AppRoutes'
import { Error400 } from '../Errors/Error400'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'

import { AuthModeType } from '../../common-code/domain-models'
export function AppBody({

    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement {
    // TODO: create an DialogContext to handle all app alerts
    const [alert, setAlert] = React.useState(false)

    return (
        <div id="App" className={styles.app}>
            <a className="usa-skipnav" href="#main-content">
                Skip to main content
            </a>
            <GovBanner aria-label="Official government website" />
            <Header
                authMode={authMode}
                setAlert={setAlert}
            />
            <main id="main-content" className={styles.mainContent} role="main">
                {alert && Error400}
                <AppRoutes authMode={authMode} />
            </main>
            <Footer />
        </div>
    )
}
