import React from 'react'

import { NavLink } from 'react-router-dom'
import styles from './Errors.module.scss'

import { PageHeading } from '../../components/PageHeading'
import { GridContainer } from '@trussworks/react-uswds'
import { RoutesRecord } from '@mc-review/constants'

export const ErrorInvalidSubmissionStatus = (): React.ReactElement => {
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading>This submission was sent to CMS</PageHeading>
                <p>
                    <span>It cannot be edited. Return to your </span>
                    <NavLink to={RoutesRecord.DASHBOARD_SUBMISSIONS}>
                        Dashboard
                    </NavLink>
                    .
                </p>
            </GridContainer>
        </section>
    )
}
