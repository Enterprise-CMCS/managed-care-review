import React from 'react'
import styles from './Errors.module.scss'

import { PageHeading } from '../../components'
import { GridContainer } from '@trussworks/react-uswds'
import { ContactSupportLink } from '../../components/ErrorAlert/ContactSupportLink'

export const GenericErrorPage = (): React.ReactElement => {
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading>System error</PageHeading>
                <p>
                    <span>
                        We're having trouble loading this page. Please refresh
                        your browser and if you continue to experience an
                        error,&nbsp;
                    </span>
                    <ContactSupportLink />
                </p>
            </GridContainer>
        </section>
    )
}
