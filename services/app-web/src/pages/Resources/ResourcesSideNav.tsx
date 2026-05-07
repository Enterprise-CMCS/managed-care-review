import React from 'react'
import classNames from 'classnames'
import { GridContainer, SideNav } from '@trussworks/react-uswds'
import { Outlet, useLocation } from 'react-router-dom'
import { ReactRouterLinkWithLogging } from '../../components/TealiumLogging/Link'
import { getRouteName } from '../../routeHelpers'
import styles from './ResourcesSideNav.module.scss'

export const ResourcesSideNav = ({
    showSideNav = true,
}: {
    showSideNav?: boolean
}): React.ReactElement => {
    const { pathname } = useLocation()
    const routeName = getRouteName(pathname)

    const isCurrentLink = (route: 'HELP' | 'RESOURCES_TRAINING'): boolean =>
        routeName === route || (route === 'HELP' && routeName === 'RESOURCES')

    const isSelectedLink = (route: 'HELP' | 'RESOURCES_TRAINING'): string =>
        isCurrentLink(route) ? 'usa-current' : ''

    return (
        <div className={styles.background}>
            <div className={styles.pageHeader}>
                <GridContainer className={styles.pageHeaderContainer}>
                    <div className={styles.pageHeaderTitle}>Resources</div>
                </GridContainer>
            </div>
            <GridContainer className={styles.layoutContainer}>
                {showSideNav && (
                    <div className={styles.sideNavContainer}>
                        <SideNav
                            items={[
                                <ReactRouterLinkWithLogging
                                    to="help"
                                    className={isSelectedLink('HELP')}
                                    aria-current={
                                        isCurrentLink('HELP')
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    Submission form guidance
                                </ReactRouterLinkWithLogging>,
                                <ReactRouterLinkWithLogging
                                    to="training"
                                    className={isSelectedLink(
                                        'RESOURCES_TRAINING'
                                    )}
                                    aria-current={
                                        isCurrentLink('RESOURCES_TRAINING')
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    Resources and training
                                </ReactRouterLinkWithLogging>,
                            ]}
                        />
                    </div>
                )}
                <div
                    className={classNames(
                        styles.contentContainer,
                        !showSideNav && styles.noSideNavContentContainer
                    )}
                >
                    <Outlet />
                </div>
            </GridContainer>
        </div>
    )
}
