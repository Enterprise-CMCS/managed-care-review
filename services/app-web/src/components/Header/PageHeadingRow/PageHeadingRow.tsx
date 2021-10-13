import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import styles from './Header.module.scss'

import PageHeading from '../../PageHeading'
import { StateIcon, StateIconProps } from '../StateIcon/StateIcon'
import { User, StateUser } from '../../../gen/gqlClient'

const StateUserRow = ({
    user,
    heading,
}: {
    user: StateUser
    heading?: string
}) => {
    return (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                <Grid row className="flex-align-center">
                    <div>
                        <StateIcon
                            code={user.state.code as StateIconProps['code']}
                        />
                    </div>
                    <PageHeading>
                        <span>{user.state.name}&nbsp;</span>
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
    heading?: string
}

export const PageHeadingRow = ({
    isLoading = false,
    heading,
    loggedInUser,
}: PageHeadingProps): React.ReactElement | null => {
    if (!loggedInUser) {
        return <LandingRow isLoading={isLoading} />
    }

    if (loggedInUser.__typename === 'CMSUser') {
        return null
    } else if (loggedInUser.__typename === 'StateUser') {
        return <StateUserRow user={loggedInUser} heading={heading} />
    } else {
        return <h1>Programming Error: Unkown User Type: {loggedInUser}</h1>
    }
}
