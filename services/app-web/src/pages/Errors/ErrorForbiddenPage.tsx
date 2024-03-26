import React from 'react'
import styles from './Errors.module.scss'
import { GridContainer } from '@trussworks/react-uswds'
import { usePage } from '../../contexts/PageContext'

interface ForbiddenErrorPageProps {
    errorMsg?: string
}

export const ErrorForbiddenPage = ({
    errorMsg,
}: ForbiddenErrorPageProps): React.ReactElement => {
    const { updateHeading } = usePage()
    updateHeading({ customHeading: 'Not allowed' })
    return (
        <section className={styles.errorsContainer}>
            <GridContainer>
                <h1>Forbidden </h1>
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
