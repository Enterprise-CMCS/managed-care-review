import { IconError } from '@trussworks/react-uswds'
import styles from '../DataDetail.module.scss'

export const DataDetailMissingField = (): React.ReactElement => {
    const requiredFieldMissingText = 'You must provide this information.'

    return (
        <span className={styles.missingInfo}>
            <span>
                <IconError aria-label="An error icon" size={3} />
            </span>
            <span>{requiredFieldMissingText}</span>
        </span>
    )
}
