import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import styles from './Errors.module.scss'

import { GridContainer } from '@trussworks/react-uswds'
import { usePage } from '../../contexts/PageContext'

export const GenericErrorPage = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT

    const { updateHeading } = usePage()
    updateHeading({ customHeading: 'Error' })

    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <h1>System error </h1>
                <p>
                    <span>
                        We're having trouble loading this page. Please refresh
                        your browser and if you continue to experience an
                        error,&nbsp;
                    </span>
                    <a
                        href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                        className="usa-link"
                        target="_blank"
                        rel="noreferrer"
                    >
                        let us know.
                    </a>
                </p>
            </GridContainer>
        </section>
    )
}
