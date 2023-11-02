import React from 'react'
import styles from '../../Select/Select.module.scss'
import Select, {
    AriaOnFocus,
    Props,
    components,
    MenuListProps,
    MultiValue,
} from 'react-select'

export type FilterSelectPropType = {
    name: string
    value?: FilterOptionType[]
    filterOptions: FilterOptionType[]
    label?: string
    toggleClearFilter?: boolean
}

export type FilterOptionType = {
    readonly label: string
    readonly value: string
}

export type FilterSelectedOptionsType = MultiValue<FilterOptionType>

export const FilterSelect = ({
    name,
    filterOptions,
    label,
    toggleClearFilter,
    ...selectProps
}: FilterSelectPropType & Props<FilterOptionType, true>) => {
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

    return (
        <div data-testid={`${name}-filter`}>
            {label && (
                <label htmlFor={`${name}-filter-select-input`}>{label}</label>
            )}
            <Select
                options={filterOptions}
                className={styles.multiSelect}
                classNamePrefix="select"
                id={`${name}-filter-select`}
                inputId={`${name}-filter-select-input`}
                name={`${name}`}
                isSearchable
                isMulti
                aria-label={`${name} filter selection`}
                ariaLiveMessages={{
                    onFocus,
                }}
                components={{ MenuList }}
                {...selectProps}
            />
        </div>
    )
}
