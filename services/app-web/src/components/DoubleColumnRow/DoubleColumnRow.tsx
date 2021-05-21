import { Grid } from '@trussworks/react-uswds'
import styles from './DoubleColumnRow.module.scss'

export type DoubleColumnRowProps = {
    left?: React.ReactNode
    right?: React.ReactNode
}

export const DoubleColumnRow = ({
    left,
    right,
}: DoubleColumnRowProps): React.ReactElement => {
    return (
        <Grid row gap className={styles.row}>
            <Grid tablet={{ col: 6 }}>{left}</Grid>
            <Grid tablet={{ col: 6 }}>{right}</Grid>
        </Grid>
    )
}
