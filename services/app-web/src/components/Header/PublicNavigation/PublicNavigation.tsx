import React from 'react'
import { GridContainer, PrimaryNav } from '@trussworks/react-uswds'
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
            <ReactRouterLinkWithLogging
                key={item.label}
                to={item.to}
                className={`${styles.navigationLink} ${
                    isActive ? styles.navigationLinkActive : ''
                }`}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className={styles.navigationLabel}>{item.label}</span>
            </ReactRouterLinkWithLogging>
        )
    })

    return (
        <div className={styles.navigation}>
            <GridContainer className={styles.navigationContainer}>
                <PrimaryNav
                    items={items}
                    aria-label="Public page navigation"
                    className={styles.primaryNav}
                />
            </GridContainer>
        </div>
    )
}
