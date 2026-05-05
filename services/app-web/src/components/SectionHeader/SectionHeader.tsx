import styles from './SectionHeader.module.scss'
import classNames from 'classnames'
import { NavLinkWithLogging } from '../TealiumLogging'
import type { JSX } from 'react'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type SectionHeaderProps = {
    header: string
    children?: React.ReactNode
    editNavigateTo?: string // Controls appearance of edit link to the right of main heading - should be pathname substring for use with NavLink
    subHeaderComponent?: React.ReactNode // Controls appearance of additional component below main heading
    sectionId?: string
    headerId?: string
    hideBorderBottom?: boolean
    hideBorderTop?: boolean
    headingLevel?: HeadingTag
    fontSize?: string
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
    headingLevel = 'h2',
    fontSize,
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

    //This lets you customize the header level
    const Heading = headingLevel

    return (
        <div className={classes} id={sectionId}>
            <div className={primaryDivClasses}>
                <Heading
                    id={headerId}
                    className={styles.headerTag}
                    style={{
                        fontSize,
                    }}
                >
                    {header}
                </Heading>
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
