import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from './SectionHeader.module.scss'

type SectionHeaderProps = {
    header: string
    navigateTo?: string
}

export const SectionHeader = ({
    header,
    navigateTo,
}: SectionHeaderProps): React.ReactElement => {
    return (
        <div className={styles.reviewSectionHeader}>
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
        </div>
    )
}
