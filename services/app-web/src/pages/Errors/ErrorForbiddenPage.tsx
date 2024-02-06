import React from 'react'
import styles from './Errors.module.scss'
import { GridContainer } from '@trussworks/react-uswds'
import { PageHeading } from '../../components'

interface ForbiddenErrorPageProps {
    errorMsg?: string
}

export const ErrorForbiddenPage = ({
    errorMsg,
}: ForbiddenErrorPageProps): React.ReactElement => {
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <PageHeading>Forbidden</PageHeading>
                {errorMsg ? (
                    <p>{errorMsg}</p>
                ) : (
                    <p>
                        You do not have permission to view the requested file or
                        resource.
                    </p>
                )}
            </GridContainer>
        </section>
    )
}
