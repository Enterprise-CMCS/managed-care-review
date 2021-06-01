import React from 'react'

import { NavLink } from 'react-router-dom'
import styles from './Errors.module.scss'

import PageHeading from '../../components/PageHeading'
import { GridContainer } from '@trussworks/react-uswds'

export const ErrorInvalidSubmissionStatus = (): React.ReactElement => {
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading>Submission is not a draft</PageHeading>
                <p>
                    This submission exists but is no longer a draft. It cannot
                    be edited.
                </p>
                <p>
                    <span>Return to your </span>
                    <NavLink to="/dashboard">Dashboard</NavLink>
                </p>
            </GridContainer>
        </section>
    )
}
