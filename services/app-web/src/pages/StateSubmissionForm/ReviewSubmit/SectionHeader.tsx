import React from 'react'
import { Link } from '@trussworks/react-uswds'

import styles from './ReviewSubmit.module.scss'

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
}

export const SectionHeader = ({header, submissionName}: SectionHeaderProps): React.ReactElement => {
    return(
        <div className={styles.reviewSectionHeader}>
            <h3 className={submissionName ? styles.submissionName : ''}>{header}</h3>
            <div>
                <Link href="#" className="usa-button usa-button--outline">Edit</Link>
            </div>
        </div>
    )
}
