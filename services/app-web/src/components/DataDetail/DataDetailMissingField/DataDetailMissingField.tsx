import { Icon } from '@trussworks/react-uswds'
import styles from '../DataDetail.module.scss'
import classnames from 'classnames'

export type DataDetailMissingFieldProps = {
    requiredText?: string
    classname?: string
}

export const DataDetailMissingField = ({
    requiredText,
    classname,
}: DataDetailMissingFieldProps): React.ReactElement => {
    const requiredFieldMissingText =
        requiredText || 'You must provide this information.'

    return (
        <span className={classnames(styles.missingInfo, classname)}>
            <span>
                <Icon.Error aria-label="An error icon" size={3} />
            </span>
            <span>{requiredFieldMissingText}</span>
        </span>
    )
}
