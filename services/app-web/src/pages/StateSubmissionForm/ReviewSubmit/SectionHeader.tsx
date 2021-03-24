import React from 'react'
import { Link } from '@trussworks/react-uswds'

import styles from './ReviewSubmit.module.scss'

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

export const SectionHeader = ({header, submissionName, href}: SectionHeaderProps): React.ReactElement => {
    return(
        <div className={styles.reviewSectionHeader}>
            <h2 className={submissionName ? styles.submissionName : ''}>{header}</h2>
            <div>
                <Link variant="unstyled" href={href} className="usa-button usa-button--outline">Edit <span className="srOnly">{header}</span></Link>
            </div>
        </div>
    )
}
