import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import styles from './Header.module.scss'
import { StateIcon } from './StateIcon'
import { User } from '../../gen/gqlClient'

type PageHeadingProps = {
    isLoading?: boolean
    loggedInUser?: User
    heading?: string
}

export const PageHeading = ({
    isLoading = false,
    heading = 'Managed Care Dashboard',
    loggedInUser,
}: PageHeadingProps): React.ReactElement => {
    return loggedInUser ? (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                <Grid row className="flex-align-center">
                    <div>
                        <StateIcon code={loggedInUser.state.code} />
                    </div>
                    <h1>
                        <span>{loggedInUser.state.name}&nbsp;</span>
                        <span className="font-heading-lg text-light">
                            {heading}
                        </span>
                    </h1>
                </Grid>
            </GridContainer>
        </div>
    ) : (
        <div className={styles.landingPageHeading}>
            <GridContainer>
                <h1>
                    {!isLoading && (
                        <>
                            <span className="text-bold">Manged Care Review&nbsp;</span>
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
