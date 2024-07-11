import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import styles from './Errors.module.scss'

import { PageHeading, LinkWithLogging } from '../../components'
import { GridContainer } from '@trussworks/react-uswds'

export const GenericErrorPage = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
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
                    <LinkWithLogging
                        href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                        variant="unstyled"
                        target="_blank"
                        rel="noreferrer"
                    >
                        let us know.
                    </LinkWithLogging>
                </p>
            </GridContainer>
        </section>
    )
}
