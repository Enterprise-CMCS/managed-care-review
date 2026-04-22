import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'
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
            route === 'HELP' || pathname.startsWith(RoutesRecord.RESOURCES),
    },
    {
        label: 'Contact us',
        to: RoutesRecord.CONTACT_US,
        isActive: (_, pathname) => pathname.startsWith(RoutesRecord.CONTACT_US),
    },
]

export const PublicNavigation = ({
    route,
    pathname,
}: PublicNavigationProps): React.ReactElement => {
    return (
        <nav aria-label="Public page navigation" className={styles.navigation}>
            <GridContainer className={styles.navigationContainer}>
                <ul className={styles.navigationList}>
                    {publicNavItems.map((item) => {
                        const isActive = item.isActive(route, pathname)

                        return (
                            <li
                                key={item.label}
                                className={styles.navigationItem}
                            >
                                <ReactRouterLinkWithLogging
                                    to={item.to}
                                    className={`${styles.navigationLink} ${
                                        isActive
                                            ? styles.navigationLinkActive
                                            : ''
                                    }`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {item.label}
                                </ReactRouterLinkWithLogging>
                            </li>
                        )
                    })}
                </ul>
            </GridContainer>
        </nav>
    )
}
