import { Icon as UswdsIcon } from '@trussworks/react-uswds'
import styles from './InlineDocumentWarning.module.scss'

interface USWDSIconProps {
    focusable?: boolean
    role?: string
    size?: 3 | 4 | 5 | 6 | 7 | 8 | 9
    className?: string
}

type IconProps = USWDSIconProps & React.JSX.IntrinsicElements['svg']

type IconType = keyof typeof UswdsIcon
export const InlineDocumentWarning = ({
    message,
    iconType,
}: {
    message?: string
    iconType?: IconType
}): React.ReactElement | null => {
    const requiredFieldMissingText =
        message || 'Document download is unavailable'
    const type = iconType || 'Warning'
    const Icon = UswdsIcon[type] as React.ComponentType<IconProps>

    return (
        <span className={styles.missingInfo}>
            <span>
                <Icon aria-label={`An ${type} icon`} size={3} />
            </span>
            <span>{requiredFieldMissingText}</span>
        </span>
    )
}
