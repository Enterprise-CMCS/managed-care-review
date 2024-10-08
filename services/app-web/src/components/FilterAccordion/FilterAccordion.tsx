import React from 'react'
import styles from './FilterAccordion.module.scss'
import { Accordion } from '@trussworks/react-uswds'
import { FilterSelectPropType } from './FilterSelect/FilterSelect'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import { ButtonWithLogging } from '../TealiumLogging'
import { useTealium } from '../../hooks'
import { extractText } from '../TealiumLogging/tealiamLoggingHelpers'

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
    const { logAccordionEvent } = useTealium()
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
                    <ButtonWithLogging
                        id="clearFiltersButton"
                        type="button"
                        className={styles.clearFilterButton}
                        unstyled
                        onClick={onClearFilters}
                    >
                        Clear filters
                    </ButtonWithLogging>
                </>
            ),
            expanded: false,
            id: 'filterAccordionItems',
            handleToggle: () => {
                logAccordionEvent({
                    event_name: 'accordion_opened',
                    heading: extractText(filterTitle),
                    link_type: 'link_other',
                })
            },
        },
    ]
    return (
        <Accordion items={accordionItems} className={styles.filterAccordion} />
    )
}
