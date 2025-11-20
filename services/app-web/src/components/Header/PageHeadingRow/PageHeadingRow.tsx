import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import styles from '../Header.module.scss'

import { PageHeading } from '../../../components/PageHeading'
import { StateIcon, StateIconProps } from '../StateIcon/StateIcon'
import {
    User,
    StateUser,
    CmsUser,
    AdminUser,
    HelpdeskUser,
    BusinessOwnerUser,
    CmsApproverUser,
} from '../../../gen/gqlClient'
import {
    hasAdminUserPermissions,
    hasCMSUserPermissions,
} from '@mc-review/helpers'

const SharedSubHeadingRow = ({
    heading,
}: {
    heading: string | React.ReactElement
}) => {
    return (
        <span className={styles.submissionIdLine} data-testid="submission-id">
            <span className={styles.submissionIdLineLabel}>Submission ID</span>
            <span className={styles.submissionIdLineDivider} aria-hidden="true">
                |
            </span>
            <span className={styles.submissionIdLineValue}>{heading}</span>
        </span>
    )
}
const EntityType = ({ entityType }: { entityType: 'EQRO' | 'Health plan' }) => {
    return (
        <div className={styles.entityTypeContainer} data-testid="entityType">
            <div className={styles.entityTypeDivider} aria-hidden="true" />
            <div className={styles.entityTypeText}>
                <span className={styles.entityTypeLabel}>Entity type</span>
                <span className={styles.entityTypeValue}>{entityType}</span>
            </div>
        </div>
    )
}
const CMSUserRow = ({
    heading,
    pathname,
}: {
    user:
        | CmsUser
        | AdminUser
        | HelpdeskUser
        | BusinessOwnerUser
        | CmsApproverUser
    heading?: string | React.ReactElement
    pathname?: string
}) => {
    const hideSubID =
        pathname?.includes('dashboard') || pathname?.includes('new')
    const entityType = pathname?.includes('eqro') ? 'EQRO' : 'Health plan'
    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                {hideSubID ? (
                    <Grid row className="flex-align-center">
                        <PageHeading>
                            <span>CMS</span>
                            {heading && (
                                <span
                                    className="font-heading-lg text-light"
                                    data-testid="submission-name"
                                >
                                    {heading}
                                </span>
                            )}
                        </PageHeading>
                    </Grid>
                ) : (
                    <Grid
                        row
                        className={`flex-align-center ${styles.cmsDashboardRow}`}
                    >
                        <PageHeading>
                            <span className={styles.stateHeadingText}>CMS</span>

                            {heading && (
                                <SharedSubHeadingRow heading={heading} />
                            )}
                        </PageHeading>
                        <EntityType entityType={entityType} />
                    </Grid>
                )}
            </GridContainer>
        </div>
    )
}

const StateUserRow = ({
    user,
    heading,
    pathname,
}: {
    user: StateUser
    heading?: string | React.ReactElement
    pathname?: string
}) => {
    const hideSubID =
        pathname?.includes('dashboard') || pathname?.includes('new')
    const entityType = pathname?.includes('eqro') ? 'EQRO' : 'Health plan'

    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                {hideSubID ? (
                    <Grid row className="flex-align-center">
                        <div>
                            <StateIcon
                                code={user.state.code as StateIconProps['code']}
                            />
                            <span>{user.state.name}&nbsp;</span>
                        </div>
                        <PageHeading>
                            <span className="srOnly">
                                {user.state.name}&nbsp;
                            </span>
                            {heading && (
                                <span
                                    className="font-heading-lg text-light"
                                    data-testid="submission-name"
                                >
                                    {heading}
                                </span>
                            )}
                        </PageHeading>
                    </Grid>
                ) : (
                    <Grid
                        row
                        className={`flex-align-center ${styles.stateDashboardRow}`}
                    >
                        <div>
                            <StateIcon
                                code={user.state.code as StateIconProps['code']}
                            />
                        </div>
                        <PageHeading>
                            <span className="srOnly">
                                {user.state.name}&nbsp;
                            </span>

                            <span className={styles.stateHeadingText}>
                                {user.state.name}&nbsp;
                            </span>

                            {heading && (
                                <SharedSubHeadingRow heading={heading} />
                            )}
                        </PageHeading>
                        <EntityType entityType={entityType} />
                    </Grid>
                )}
            </GridContainer>
        </div>
    )
}

const LandingRow = ({ isLoading }: { isLoading: boolean }) => {
    return (
        <div className={styles.landingPageHeading}>
            <GridContainer>
                <h1>
                    {!isLoading && (
                        <>
                            <span className="text-bold">
                                Managed Care Review&nbsp;
                            </span>
                            <span className="font-heading-lg">
                                Medicaid and CHIP Managed Care Reporting and
                                Review System
                            </span>
                        </>
                    )}
                </h1>
            </GridContainer>
        </div>
    )
}

type PageHeadingProps = {
    isLoading?: boolean
    loggedInUser?: User
    heading?: string | React.ReactElement
    route?: string
    pathname?: string
}

export const PageHeadingRow = ({
    isLoading = false,
    heading,
    route,
    pathname,
    loggedInUser,
}: PageHeadingProps): React.ReactElement | null => {
    if (!loggedInUser) {
        if (route === 'HELP') {
            return null
        } else {
            return <LandingRow isLoading={isLoading} />
        }
    }

    if (
        hasCMSUserPermissions(loggedInUser) ||
        hasAdminUserPermissions(loggedInUser)
    ) {
        return (
            <CMSUserRow
                user={loggedInUser}
                heading={heading}
                pathname={pathname}
            />
        )
    } else if (loggedInUser.__typename === 'StateUser') {
        return (
            <StateUserRow
                user={loggedInUser}
                heading={heading}
                pathname={pathname}
            />
        )
    } else {
        return <h1>{`Programming Error: Unkown User Type: ${loggedInUser}`}</h1>
    }
}
