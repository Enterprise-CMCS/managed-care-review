import React from 'react'

import styles from './ReviewSubmit.module.scss'

export type DataDetailProps = {
    id: string
    label: string
    data?: string
    address?: React.ReactNode
}

export const DataDetail = ({id, label, data, address}: DataDetailProps): React.ReactElement => {
    return(
        <div className={styles.reviewData}>
            <label htmlFor={id}>{label}</label>
            <p id={id}>{data}{address}</p>
        </div>
    )
}
