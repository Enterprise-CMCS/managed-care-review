import React from 'react'
import { GovBanner } from '@trussworks/react-uswds'

import styles from './AppBody.module.scss'

import { AppRoutes } from './AppRoutes'
import { CheckAuth } from '../Auth/CheckAuth'
import { Footer } from '../../components/Footer/Footer'
import { Header } from '../../components/Header/Header'
import { useAuth } from '../../contexts/AuthContext'

// This is where it's safe to use useAuth and useQuery
export function AppBody(): React.ReactElement {
    const { loggedInUser } = useAuth()
    const [alert, setAlert] = React.useState<null | React.FC>(null)

    return (
        <div id="App" className={styles.app}>
            <a className="usa-skipnav" href="#main-content">
                Skip to main content
            </a>
            <GovBanner aria-label="Official government website" />
            <Header
                user={loggedInUser}
                stateCode={loggedInUser ? loggedInUser.state : undefined}
                setAlert={setAlert}
            />
            <main id="main-content" className={styles.mainContent} role="main">
                {alert && alert({})}
                <AppRoutes />
                <CheckAuth />
            </main>
            <Footer />
        </div>
    )
}
