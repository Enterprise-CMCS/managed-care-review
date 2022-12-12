import React, { useState } from 'react'
import styles from './FilterAccordion.module.scss'
import { Accordion, Button } from '@trussworks/react-uswds'

export type FilterAccordionPropType = {
    onClearFilters?: () => void
    filterTitle: string
    children: React.ReactElement[]
}

export const FilterAccordion = ({
    filterTitle,
    children,
}: FilterAccordionPropType) => {
    const [toggleClearFilter, setToggleClearFilter] = useState(false)

    const handleClearFilters = () => {
        setToggleClearFilter(!toggleClearFilter)
    }

    //This controls the clearing of each FilterSelect child component directly from this FilterAccordion component.
    // toggleClearFilter state will be passed into each FilterSelect child. In FilterSelect child component, changes in
    // toggleClearFilter prop will trigger a useEffect which will call clearValue() from the Select component ref
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
