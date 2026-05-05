import React from 'react'
import { GridContainer, SideNav } from '@trussworks/react-uswds'
import { Outlet, useLocation } from 'react-router-dom'
import { ReactRouterLinkWithLogging } from '../../components/TealiumLogging/Link'
import { getRouteName } from '../../routeHelpers'
import styles from './ResourcesLayout.module.scss'

export const ResourcesLayout = (): React.ReactElement => {
    const { pathname } = useLocation()
    const routeName = getRouteName(pathname)

    const isSelectedLink = (route: 'HELP' | 'RESOURCES_TRAINING'): string =>
        routeName === route || (route === 'HELP' && routeName === 'RESOURCES')
            ? 'usa-current'
            : ''

    return (
        <div className={styles.background}>
            <GridContainer className={styles.layoutContainer}>
                <div className={styles.sideNavContainer}>
                    <SideNav
                        items={[
                            <ReactRouterLinkWithLogging
                                to="help"
                                className={isSelectedLink('HELP')}
                            >
                                Submission form guidance
                            </ReactRouterLinkWithLogging>,
                            <ReactRouterLinkWithLogging
                                to="training"
                                className={isSelectedLink('RESOURCES_TRAINING')}
                            >
                                Resources and training
                            </ReactRouterLinkWithLogging>,
                        ]}
                    />
                </div>
                <div className={styles.contentContainer}>
                    <Outlet />
                </div>
            </GridContainer>
        </div>
    )
}
