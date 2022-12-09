import React, { useState } from 'react'
import styles from './FilterAccordion.module.scss'
import { Accordion, Button } from '@trussworks/react-uswds'

export type FilterAccordionPropType = {
    onClearFilters?: () => void
    filterTitle: string
    children: React.ReactElement[]
}

export const FilterAccordion = ({
    onClearFilters,
    filterTitle,
    children,
}: FilterAccordionPropType) => {
    const [toggleClearFilter, setToggleClearFilter] = useState(false)

    const handleClearFilters = () => {
        setToggleClearFilter(!toggleClearFilter)
        if (onClearFilters) onClearFilters()
    }

    //This controls the clearing of each FilterSelect child component directly from this FilterAccordion component instead of
    // having to create logic in the parent component of both of these. This will rerender the children when toggleClearFilter
    // state changes and pass this prop down to FilterSelect.
    const childrenWithToggleProps = React.Children.map(children, (child) => {
        return React.cloneElement(child as React.ReactElement, {
            toggleClearFilter,
        })
    })

    const accordionItems = [
        {
            title: <div className={styles.filterTitle}>{filterTitle}</div>,
            content: (
                <>
                    <div className={styles.filters}>
                        {childrenWithToggleProps}
                    </div>
                    <Button
                        type="button"
                        className={styles.clearFilterButton}
                        unstyled
                        onClick={handleClearFilters}
                    >
                        Clear filters
                    </Button>
                </>
            ),
            expanded: false,
            id: 'filterAccordionItems',
        },
    ]
    return (
        <Accordion items={accordionItems} className={styles.filterAccordion} />
    )
}
