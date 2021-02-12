import React from 'react'
import { Button, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'
import styles from './Header.module.scss'

import { useAuth } from '../../pages/App/AuthContext'
import { Logo } from '../Logo/Logo'

const getStateInfo = (
    stateAbbrev: SupportedStateCodes
): { stateName: string; StateIcon: React.FunctionComponent } => {
    switch (stateAbbrev) {
        case 'MN':
            return { stateName: 'Minnesota', StateIcon: MnIcon }
        case 'VA':
            return { stateName: 'Virginia', StateIcon: VaIcon }
        default:
            return {
                stateName: 'STATE UNKNOWN',
                StateIcon: () => <span></span>,
            }
    }
}

const StateCodes = {
    MN: 'MN',
    VA: 'VA',
} as const
type SupportedStateCodes = typeof StateCodes[keyof typeof StateCodes]

export type HeaderProps = {
    stateCode?: SupportedStateCodes
    activePage?: string
    loggedIn: boolean
    user?: {
        name: string
        email: string
    }
}

/**
 * CMS Header
 */
export const Header = ({
    stateCode,
    activePage = 'Managed Care Dashboard',
    loggedIn,
    user,
}: HeaderProps): React.ReactElement => {
    const { isAuthenticated, logout } = useAuth()
    const { stateName, StateIcon } = stateCode
        ? getStateInfo(stateCode)
        : { stateName: 'STATE UNKNOWN', StateIcon: () => <span></span> }

    return (
        <header>
            <div className={styles.banner}>
                <Logo
                    src={medicaidLogo}
                    alt="Medicaid.gov-Keeping America Healthy"
                />
                {isAuthenticated && user ? (
                    <div className={styles.userInfo}>
                        <span>{user.email}</span>
                        <span className={styles.divider}>|</span>

                        <Button type="button" unstyled onClick={() => logout()}>
                            Sign out
                        </Button>
                    </div>
                ) : (
                    <Link
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        variant="unstyled"
                        to="/auth"
                    >
                        Sign In
                    </Link>
                )}
            </div>
            {loggedIn ? (
                <div className={styles.dashboardHeading}>
                    <div>
                        <StateIcon />
                    </div>
                    <h1 className="margin-0">
                        <span>{stateName}</span>
                        <span className="font-heading-lg text-light">
                            {activePage}
                        </span>
                    </h1>
                </div>
            ) : (
                <div className={styles.landingPageHeading}>
                    <h1>
                        <span>MAC-MCCRS</span>
                        <span className="font-heading-lg">
                            Medicaid and CHIP Managed Care Reporting and Review
                            System
                        </span>
                    </h1>
                </div>
            )}
        </header>
    )
}
