import React from 'react'
import styles from './FilterAccordion.module.scss'
import { Button } from '@trussworks/react-uswds'

export type FilterAccordionPropType = {
    onClearFilters: () => void
    filterTitle: string
    children: React.ReactNode
}

export const FilterAccordion = ({
    onClearFilters,
    filterTitle,
    children,
}: FilterAccordionPropType) => {
    return (
        <div
            id="filter-container"
            data-testid="filter-container"
            className={styles.filterContainer}
        >
            <div className={styles.filterContainerHeader}>
                <div className={styles.filterTitle}>{filterTitle}</div>
                <div className={styles.headerActions}>
                    <Button
                        type="button"
                        className={styles.clearFilterButton}
                        unstyled
                        onClick={onClearFilters}
                    >
                        Clear Filters
                    </Button>
                </div>
            </div>
            <div className={styles.filters}>{children}</div>
        </div>
    )
}
