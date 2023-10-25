import { Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from './SectionHeader.module.scss'
import classNames from 'classnames'

export type SectionHeaderProps = {
    header: string
    navigateTo?: string
    children?: React.ReactNode
    sectionId?: string
    headerId?: string
    hideBorder?: boolean
}

export const SectionHeader = ({
    header,
    navigateTo,
    children,
    sectionId,
    headerId,
    hideBorder,
}: SectionHeaderProps & JSX.IntrinsicElements['div']): React.ReactElement => {
    const classes = classNames({
        [styles.summarySectionHeader]: true,
        [styles.summarySectionHeaderBorder]: !hideBorder,
    })
    return (
        <div className={classes} id={sectionId}>
            <h2 id={headerId}>{header}</h2>
            <div>
                {navigateTo && (
                    <Link
                        variant="unstyled"
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        to={navigateTo}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </Link>
                )}
                {children}
            </div>
        </div>
    )
}
