import React from 'react'

import { NavLink } from 'react-router-dom'
import styles from './Errors.module.scss'

import { GridContainer } from '@trussworks/react-uswds'
import { RoutesRecord } from '../../constants'
import { usePage } from '../../contexts/PageContext'

export const Error404 = (): React.ReactElement => {
    const { updateHeading } = usePage()
    updateHeading({ customHeading: 'Not found' })
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <h1>404 / Page not found</h1>
                <p>You might want to double-check your link and try again.</p>
                <p>
                    <span>Or return to your </span>
                    <NavLink to={RoutesRecord.DASHBOARD_SUBMISSIONS}>
                        Dashboard
                    </NavLink>
                    .
                </p>
            </GridContainer>
        </section>
    )
}
