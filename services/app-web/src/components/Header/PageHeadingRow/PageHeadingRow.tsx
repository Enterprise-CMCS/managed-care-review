import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import styles from '../Header.module.scss'
import { PageHeading } from '../../PageHeading'
import { StateIcon, StateIconProps } from '../StateIcon/StateIcon'
import { User, StateUser } from '../../../gen/gqlClient'
import {
    hasAdminUserPermissions,
    hasCMSUserPermissions,
    hasReadOnlyUserPermissions,
} from '@mc-review/helpers'

const CMSUserRow = ({
    heading,
    hideOrgLabel = false,
}: {
    heading?: string | React.ReactElement
    // Read-only users don't get the "CMS" organization label.
    hideOrgLabel?: boolean
}) => {
    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                {typeof heading === 'object' ? (
                    heading
                ) : (
                    <Grid row className="flex-align-center">
                        <PageHeading>
                            {!hideOrgLabel && <span>CMS</span>}
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
                )}
            </GridContainer>
        </div>
    )
}

const StateUserRow = ({
    user,
    heading,
}: {
    user: StateUser
    heading?: string | React.ReactElement
}) => {
    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                {typeof heading === 'object' ? (
                    heading
                ) : (
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
                )}
            </GridContainer>
        </div>
    )
}

const LandingRow = ({ isLoading }: { isLoading: boolean }) => {
    return (
        <div className={styles.landingPageHeading}>
            <GridContainer>
                {!isLoading && (
                    <>
                        <h1>Managed Care Review&nbsp;</h1>
                        <h2 className="mcr-homepage-h2">
                            Medicaid and CHIP Managed Care Reporting and Review
                            System
                        </h2>
                    </>
                )}
            </GridContainer>
        </div>
    )
}

type PageHeadingProps = {
    isLoading?: boolean
    loggedInUser?: User
    heading?: string | React.ReactElement
    route?: string
}

export const PageHeadingRow = ({
    isLoading = false,
    heading,
    route,
    loggedInUser,
}: PageHeadingProps): React.ReactElement | null => {
    if (!loggedInUser) {
        if (
            route === 'RESOURCES' ||
            route === 'HELP' ||
            route === 'CONTACT_US' ||
            route === 'RESOURCES_TRAINING'
        ) {
            return null
        } else {
            return <LandingRow isLoading={isLoading} />
        }
    }

    if (hasReadOnlyUserPermissions(loggedInUser)) {
        // Read-only users see the CMS-side pages but without the "CMS" org
        // label. On pages with no heading of their own (e.g. the dashboard),
        // render nothing rather than an empty header.
        if (!heading) {
            return null
        }
        return <CMSUserRow heading={heading} hideOrgLabel />
    } else if (
        hasCMSUserPermissions(loggedInUser) ||
        hasAdminUserPermissions(loggedInUser)
    ) {
        return <CMSUserRow heading={heading} />
    } else if (loggedInUser.__typename === 'StateUser') {
        return <StateUserRow heading={heading} user={loggedInUser} />
    } else {
        return (
            <h1>{`Programming Error: Unknown User Type: ${loggedInUser}`}</h1>
        )
    }
}
