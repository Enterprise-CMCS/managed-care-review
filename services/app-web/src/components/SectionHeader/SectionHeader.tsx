import styles from './SectionHeader.module.scss'
import classNames from 'classnames'
import { NavLinkWithLogging } from '../TealiumLogging/Link'

export type SectionHeaderProps = {
    header: string
    children?: React.ReactNode
    editNavigateTo?: string // Controls appearance of edit link to the right of main heading - should be pathname substring for use with NavLink
    subHeaderComponent?: React.ReactNode // Controls appearance of additional component below main heading
    sectionId?: string
    headerId?: string
    hideBorder?: boolean
}

export const SectionHeader = ({
    header,
    subHeaderComponent,
    editNavigateTo,
    children,
    sectionId,
    headerId,
    hideBorder,
}: SectionHeaderProps & JSX.IntrinsicElements['div']): React.ReactElement => {
    const classes = classNames({
        [styles.summarySectionHeader]: true,
        [styles.summarySectionHeaderBorder]: !hideBorder,
        [styles.hasSubheader]: subHeaderComponent,
    })

    const primaryDivClasses = classNames({
        [styles.primaryDiv]: !!(editNavigateTo || children),
    })

    return (
        <div className={classes} id={sectionId}>
            <div className={primaryDivClasses}>
                <h2 id={headerId}>{header}</h2>
                {subHeaderComponent}
            </div>
            <div>
                {editNavigateTo && (
                    <NavLinkWithLogging
                        variant="unstyled"
                        className="usa-button usa-button--outline"
                        to={editNavigateTo}
                    >
                        Edit <span className="srOnly">{header}</span>
                    </NavLinkWithLogging>
                )}
                {children}
            </div>
        </div>
    )
}
