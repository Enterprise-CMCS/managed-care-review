import React, { useRef, useEffect } from 'react'
import styles from '../../Select/Select.module.scss'
import Select, {
    AriaOnFocus,
    Props,
    SelectInstance,
    GroupBase,
    components,
    MenuListProps,
} from 'react-select'
import { usePrevious } from '../../../hooks'

export type FilterSelectPropType = {
    name: string
    initialValues?: string[]
    filterOptions: FilterOptionType[]
    label?: string
    toggleClearFilter?: boolean
}

export type FilterOptionType = {
    readonly label: string
    readonly value: string
}

export const FilterSelect = ({
    name,
    initialValues,
    filterOptions,
    label,
    toggleClearFilter,
    ...selectProps
}: FilterSelectPropType & Props<FilterOptionType, true>) => {
    const prevToggleClearFilter = usePrevious(toggleClearFilter)
    const selectInputRef =
        useRef<
            SelectInstance<FilterOptionType, true, GroupBase<FilterOptionType>>
        >(null)

    const onFocus: AriaOnFocus<FilterOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    //This component just wraps the menu list inside a div, so we can set a data-testid and run jest tests.
    const MenuList = (props: MenuListProps<FilterOptionType>) => {
        return (
            <components.MenuList {...props}>
                <div data-testid={`${name}-filter-options`}>
                    {props.children}
                </div>
            </components.MenuList>
        )
    }

    useEffect(() => {
        if (
            toggleClearFilter !== prevToggleClearFilter &&
            selectInputRef.current?.clearValue
        ) {
            selectInputRef.current.clearValue()
        }
    }, [toggleClearFilter, prevToggleClearFilter, selectInputRef])

    return (
        <div data-testid={`${name}-filter`}>
            {label && <label htmlFor={`${name}-filterSelect`}>{label}</label>}
            <Select
                ref={selectInputRef}
                options={filterOptions}
                className={styles.multiSelect}
                classNamePrefix="select"
                id={`${name}-filter-select`}
                name={`${name}`}
                isSearchable
                isMulti
                aria-label={`${name} filter selection`}
                ariaLiveMessages={{
                    onFocus,
                }}
                // menuPortalTarget moves the dropdown element to the document body because when inside the Accordion
                // component the menu list will be cut off.
                menuPortalTarget={document.body}
                //This custom MenuList component, just places a test ID on the menu list. We need this for testing.
                components={{ MenuList }}
                {...selectProps}
            />
        </div>
    )
}
