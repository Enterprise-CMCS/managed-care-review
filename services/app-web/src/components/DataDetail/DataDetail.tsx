import React from 'react'
import styles from './DataDetail.module.scss'
import { DataDetailMissingField } from './DataDetailMissingField'

type DataDetailProps = {
    id: string
    label: string
    data?: React.ReactNode
    explainMissingData?: boolean // Display fallback text when data is undefined or null
}

/*
    DataDetail displays definition terms and descriptions using semantic HTML.
    This is useful for summarizing static data. Should be used inside a <dl>.
    If explainMissingData prop is true, display label with an error message when data is undefined. Otherwise, hide entire block from page.
*/
export const DataDetail = ({
    id,
    label,
    data,
    explainMissingData = false,
}: DataDetailProps): React.ReactElement | null => {
    if (!explainMissingData && !data) return null

    return (
        <div className={styles.dataDetail}>
            <dt id={id}>{label}</dt>
            <dd role="definition" aria-labelledby={id}>
                {Array.isArray(data) ? (
                    data.join(', ').toUpperCase()
                ) : explainMissingData && !data ? (
                    <DataDetailMissingField />
                ) : (
                    data
                )}
            </dd>
        </div>
    )
}
