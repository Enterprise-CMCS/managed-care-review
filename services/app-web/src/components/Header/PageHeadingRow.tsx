import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'

import styles from './Header.module.scss'

import PageHeading from '../../components/PageHeading'
import { StateIcon, StateIconProps } from './StateIcon'
import { User } from '../../gen/gqlClient'

type PageHeadingProps = {
    isLoading?: boolean
    loggedInUser?: User
    heading?: string
}

export const PageHeadingRow = ({
    isLoading = false,
    heading,
    loggedInUser,
}: PageHeadingProps): React.ReactElement => {
    return loggedInUser ? (
        <div className={styles.dashboardHeading}>
            <GridContainer>
                <Grid row className="flex-align-center">
                    <div>
                        <StateIcon
                            code={
                                loggedInUser.state
                                    .code as StateIconProps['code']
                            }
                        />
                    </div>
                    <PageHeading>
                        <span>{loggedInUser.state.name}&nbsp;</span>
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
    ) : (
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
