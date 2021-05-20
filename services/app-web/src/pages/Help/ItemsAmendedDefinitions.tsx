import React from 'react'

import { GridContainer, Table } from '@trussworks/react-uswds' 
import styles from './Help.module.scss'

export const ItemsAmendedDefinitions = (): React.ReactElement => {
    return(
        <section className={styles.helpSection}>
            <GridContainer>
                <Table bordered>
                    <tr>
                        <th>Item</th>
                        <th>Definition</th>
                    </tr>
                </Table>
            </GridContainer>
        </section>
    )
}