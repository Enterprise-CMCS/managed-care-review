import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'
import { useLocation } from 'react-router'
import styles from './AppBody.module.scss'

import { AppRoutes } from './AppRoutes'
import { Error400 } from '../Errors/Error400'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { Loading } from '../../components/Loading'

import { AuthModeType } from '../../common-code/domain-models'
import { useAuth } from '../../contexts/AuthContext'
import { useTitle } from '../../hooks/useTitle'
import { getRouteName, PageTitlesRecord } from '../../constants/routes'

export function AppBody({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement {
    const { pathname } = useLocation()
    const route = getRouteName(pathname)

    /*
        Adds page titles throughout the application
    */
    const title =
        route === 'UNKNOWN_ROUTE'
            ? 'Managed Care Dashboard'
            : PageTitlesRecord[route]
    useTitle(title)

    // TODO: create an DialogContext to handle all app alerts
    const [alert, setAlert] = React.useState(false)
    const [showLoading, setShowLoading] = React.useState<
        'NOT_LOADING' | 'WAITING' | 'SHOW_LOADING'
    >('NOT_LOADING')
    const { loginStatus } = useAuth()

    // we have a loading text/icon, but we only want to display it if we've been loading for longer than .7 seconds
    // if we load faster than that, let's not tell anyone we were loading
    if (showLoading === 'NOT_LOADING' && loginStatus === 'LOADING') {
        setShowLoading('WAITING')
        setTimeout(() => {
            setShowLoading((actualShowLoading) => {
                return actualShowLoading === 'WAITING'
                    ? 'SHOW_LOADING'
                    : actualShowLoading
            })
        }, 700)
    }

    if (loginStatus !== 'LOADING' && showLoading !== 'NOT_LOADING') {
        setShowLoading('NOT_LOADING')
    }

    return (
        <div id="App" className={styles.app}>
            <a className="usa-skipnav" href="#main-content">
                Skip to main content
            </a>
            <GovBanner aria-label="Official government website" />

            <Header authMode={authMode} setAlert={setAlert} />
            <main id="main-content" className={styles.mainContent} role="main">
                {alert && Error400}
                {loginStatus === 'LOADING' ? (
                    showLoading === 'SHOW_LOADING' && <Loading />
                ) : (
                    <AppRoutes authMode={authMode} />
                )}
            </main>

            <Footer />
        </div>
    )
}
