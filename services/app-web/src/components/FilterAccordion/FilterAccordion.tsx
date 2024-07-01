import React from 'react'
import styles from './FilterAccordion.module.scss'
import { Accordion, Button } from '@trussworks/react-uswds'
import { FilterSelectPropType } from './FilterSelect/FilterSelect'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import { useTealium } from '../../hooks'

export interface FilterAccordionPropType {
    onClearFilters: () => void
    filterTitle: string | React.ReactNode
    children:
        | React.ReactElement<FilterSelectPropType>
        | Array<React.ReactElement<FilterSelectPropType>>
}

export const FilterAccordion = ({
    onClearFilters,
    filterTitle,
    children,
}: FilterAccordionPropType) => {
    const { logButtonEvent } = useTealium()
    /* multiple FilterSelect components are passed into the parent as children, and here we map
    over them to display them inside the accordion */
    const childFilters = React.Children.map(children, (child) => {
        return React.cloneElement(child)
    })

    const accordionItems: AccordionItemProps[] = [
        {
            title: filterTitle,
            headingLevel: 'h4',
            content: (
                <>
                    <div>{childFilters}</div>
                    <Button
                        id="clearFiltersButton"
                        type="button"
                        className={styles.clearFilterButton}
                        unstyled
                        onClick={(e) =>
                            logButtonEvent(
                                {
                                    text: 'Clear filters',
                                    button_style: 'link',
                                    button_type: 'button',
                                },
                                onClearFilters
                            )
                        }
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
