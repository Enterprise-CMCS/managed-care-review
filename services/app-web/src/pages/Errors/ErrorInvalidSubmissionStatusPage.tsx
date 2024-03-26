import React from 'react'

import { NavLink } from 'react-router-dom'
import styles from './Errors.module.scss'

import { GridContainer } from '@trussworks/react-uswds'
import { RoutesRecord } from '../../constants'
import { usePage } from '../../contexts/PageContext'

export const ErrorInvalidSubmissionStatus = (): React.ReactElement => {
    const { updateHeading } = usePage()
    updateHeading({ customHeading: 'Not allowed' })
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <h1>This submission was sent to CMS </h1>
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
