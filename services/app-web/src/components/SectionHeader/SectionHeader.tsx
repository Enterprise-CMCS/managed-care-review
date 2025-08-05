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
    hideBorderBottom?: boolean
    hideBorderTop?: boolean
    as?: keyof JSX.IntrinsicElements
}

export const SectionHeader = ({
    header,
    subHeaderComponent,
    editNavigateTo,
    children,
    sectionId,
    headerId,
    hideBorderBottom,
    hideBorderTop,
    as,
}: SectionHeaderProps & JSX.IntrinsicElements['div']): React.ReactElement => {
    const classes = classNames({
        [styles.summarySectionHeader]: true,
        [styles.summarySectionHeaderBorderBottom]: !hideBorderBottom,
        [styles.summarySectionHeaderBorderTop]: !hideBorderTop,
        [styles.hasSubheader]: subHeaderComponent,
    })

    const primaryDivClasses = classNames({
        [styles.primaryDiv]: !!(editNavigateTo || children),
    })

    const Tag = as ?? 'h2'

    return (
        <div className={classes} id={sectionId}>
            <div className={primaryDivClasses}>
                <Tag id={headerId}>{header}</Tag>
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
