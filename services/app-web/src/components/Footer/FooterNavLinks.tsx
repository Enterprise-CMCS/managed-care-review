import React from 'react'
import { RoutesRecord, RouteT } from '@mc-review/constants'

import styles from './Footer.module.scss'
import { ReactRouterLinkWithLogging } from '../TealiumLogging'

type FooterNavLinksProps = {
    route: RouteT | 'UNKNOWN_ROUTE'
}

type FooterNavItem = {
    label: string
    to: string
    isActive: (route: FooterNavLinksProps['route']) => boolean
}

const footerNavItems: FooterNavItem[] = [
    {
        label: 'Submission form guidance',
        to: RoutesRecord.HELP,
        isActive: (route) => route === 'HELP',
    },
    {
        label: 'Resources and Training',
        to: RoutesRecord.RESOURCES_TRAINING,
        isActive: (route) => route === 'RESOURCES_TRAINING',
    },
    {
        label: 'Contact us',
        to: RoutesRecord.CONTACT_US,
        isActive: (route) => route === 'CONTACT_US',
    },
]

export const FooterNavLinks = ({
    route,
}: FooterNavLinksProps): React.ReactElement => {
    const items = footerNavItems.map((item) => {
        const isActive = item.isActive(route)

        return (
            <ReactRouterLinkWithLogging
                key={item.label}
                to={item.to}
                className={styles.footerNavLink}
                aria-current={isActive ? 'page' : undefined}
            >
                {item.label}
            </ReactRouterLinkWithLogging>
        )
    })

    return <>{items}</>
}
