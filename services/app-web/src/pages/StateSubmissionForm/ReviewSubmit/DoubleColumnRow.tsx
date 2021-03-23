import React from 'react'
import { Grid } from '@trussworks/react-uswds'

import styles from './ReviewSubmit.module.scss'

export type DoubleColumnRowProps = {
    left?: React.ReactNode
    right?: React.ReactNode
}

export const DoubleColumnRow = ({left, right}: DoubleColumnRowProps): React.ReactElement => {
    return(
        <Grid row gap className={styles.reviewDataRow}>
            <Grid tablet={{col: 6}}> 
                {left}
            </Grid>
            <Grid tablet={{col: 6}}> 
                {right}
            </Grid>
        </Grid>
    )
}
