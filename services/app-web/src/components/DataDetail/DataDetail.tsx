import React from 'react'
import styles from './DataDetail.module.scss'
import { DataDetailMissingField } from './DataDetailMissingField'

export type DataDetailProps = {
    id: string
    label: string
    children?: React.ReactNode | string[]
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

    Possible empty values that are handled includes:
    undefined, null, empty string, empty array. A custom component that eventually renders null when called 
    will NOT be handled. Data flow is handled one way from parent > children here.
*/

export const DataDetail = ({
    id,
    label,
    children,
    explainMissingData = false,
}: DataDetailProps): React.ReactElement | null => {
    const handleArray = Array.isArray(children)
    const noData =
        !children || children === '' || (handleArray && children.length === 0)
    if (!explainMissingData && noData) return null // displays nothing - this is generally used for submission summary page
    return (
        <div className={styles.dataDetail}>
            <dt id={id}>{label}</dt>
            <dd role="definition" aria-labelledby={id}>
                {handleArray && !noData ? (
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
