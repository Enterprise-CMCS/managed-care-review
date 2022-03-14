import React from 'react'

import { Link } from '@trussworks/react-uswds'
import styles from './Errors.module.scss'

import { PageHeading } from '../../components/PageHeading'
import { GridContainer } from '@trussworks/react-uswds'

export const GenericErrorPage = (): React.ReactElement => {
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading>System error</PageHeading>
                <p>
                    <span>
                        We're having trouble loading this page. Please refresh
                        your browser and if you continue to experience an error,&nbsp;
                    </span>
                    <Link href="mailto:mc-review-team@truss.works">
                        let us know.
                    </Link>
                </p>
            </GridContainer>
        </section>
    )
}
