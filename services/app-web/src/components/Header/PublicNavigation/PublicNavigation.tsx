import React from 'react'
import { RoutesRecord, RouteT } from '@mc-review/constants'
import { ReactRouterLinkWithLogging } from '../../TealiumLogging'
import styles from './PublicNavigation.module.scss'

type PublicNavigationProps = {
    route: RouteT | 'UNKNOWN_ROUTE'
    pathname: string
}

type PublicNavItem = {
    label: string
    to: string
    isActive: (
        route: PublicNavigationProps['route'],
        pathname: string
    ) => boolean
}

const publicNavItems: PublicNavItem[] = [
    {
        label: 'Home',
        to: RoutesRecord.ROOT,
        isActive: (route) => route === 'ROOT',
    },
    {
        label: 'Resources',
        to: RoutesRecord.RESOURCES,
        isActive: (route, pathname) =>
            route === 'HELP' ||
            route === 'RESOURCES' ||
            route === 'RESOURCES_TRAINING' ||
            pathname.startsWith(RoutesRecord.RESOURCES),
    },
    {
        label: 'Contact us',
        to: RoutesRecord.CONTACT_US,
        isActive: (route) => route === 'CONTACT_US',
    },
]

export const PublicNavigation = ({
    route,
    pathname,
}: PublicNavigationProps): React.ReactElement => {
    const items = publicNavItems.map((item) => {
        const isActive = item.isActive(route, pathname)

        return (
            <li key={item.label} className="usa-nav__primary-item">
                <ReactRouterLinkWithLogging
                    to={item.to}
                    className={`usa-nav__link ${styles.navigationLink} ${
                        isActive
                            ? `usa-current ${styles.navigationLinkActive}`
                            : ''
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                >
                    {item.label}
                </ReactRouterLinkWithLogging>
            </li>
        )
    })

    return (
        <div className={styles.navigation}>
            <div className={styles.navigationContainer}>
                <nav
                    aria-label="Public page navigation"
                    className={styles.primaryNav}
                >
                    <ul className="usa-accordion">{items}</ul>
                </nav>
            </div>
        </div>
    )
}
