import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'

import styles from './Dashboard.module.scss'

export const CMSDashboard = (): React.ReactElement => {
    return (
        <>
            <div className={styles.container}>
                <GridContainer>
                    <h1>CMS Dashboard</h1>
                    <p>
                        The dashboard for CMS users has not been implemented
                        yet, you will need to access a specific submission by
                        URL for now.
                    </p>
                </GridContainer>
            </div>
        </>
    )
}
