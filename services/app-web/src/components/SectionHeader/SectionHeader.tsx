import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import { ProgressPlugin } from 'webpack'
import styles from './SectionHeader.module.scss'

export type SectionHeaderProps = {
    header: string
    navigateTo?: string
    children?: React.ReactNode
}

export const SectionHeader = ({
    header,
    navigateTo,
    children,
}: SectionHeaderProps): React.ReactElement => {
    return (
        <div className={styles.summarySectionHeader}>
            <h2>{header}</h2>
            {navigateTo && (
                <div>
                    <Link
                        variant="unstyled"
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        to={navigateTo}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </Link>
                </div>
            )}
            {children}
        </div>
    )
}
