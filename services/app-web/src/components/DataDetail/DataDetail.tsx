import React from 'react'
import styles from './DataDetail.module.scss'
import { DataDetailMissingField } from './DataDetailMissingField'

export type DataDetailProps = {
    id: string
    label: string
    children?: JSX.Element | string | string[]
    explainMissingData?: boolean // Display fallback text when data is undefined or null. Should be true on review-and-submit
}

/*
    DataDetail displays definition terms and descriptions using semantic HTML.
    This is useful for summarizing static data on review and summary pages. 
    
    This component should be used inside a HTML <dl>.
    
    Note related sub components for displaying children in uniform way
    -  DataDetailContactField (used to display contact info in an address tag)
    -  DataDetailDateRange (used to display date ranges)
    -  DataDetailCheckBoxList (used to display checkbox field results, looking up enums in their associated dictionary)
*/
export const DataDetail = ({
    id,
    label,
    children,
    explainMissingData = false,
}: DataDetailProps): React.ReactElement | null => {
    const handleArray = Array.isArray(children)
    const noData =
        !children || children === '' || (handleArray && children.length === 0) // These are all possible empty field values that could be passed as children
    if (!explainMissingData && noData) return null // displays nothing - this is used for submission summary

    return (
        <div className={styles.dataDetail}>
            <dt id={id}>{label}</dt>
            <dd role="definition" aria-labelledby={id}>
                {handleArray ? (
                    children.join(', ').toUpperCase()
                ) : explainMissingData && noData ? (
                    <DataDetailMissingField />
                ) : (
                    children
                )}
            </dd>
        </div>
    )
}
