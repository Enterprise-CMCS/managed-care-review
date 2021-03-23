import React from 'react'
import { Link } from '@trussworks/react-uswds'

import styles from './ReviewSubmit.module.scss'

export type SectionHeaderProps = {
    header: string
}

export const SectionHeader = ({header}: SectionHeaderProps): React.ReactElement => {
    return(
        <div className={styles.reviewSectionHeader}>
            <h3>{header}</h3>
            <div>
                <Link href="#" className="usa-button usa-button--outline">Edit</Link>
            </div>
        </div>
    )
}
