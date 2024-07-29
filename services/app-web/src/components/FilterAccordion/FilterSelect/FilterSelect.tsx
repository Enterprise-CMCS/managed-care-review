import React from 'react'
import styles from '../../Select/Select.module.scss'
import Select, {
    AriaOnFocus,
    Props,
    components,
    MenuListProps,
    MultiValue,
    ActionMeta,
    OnChangeValue,
} from 'react-select'
import { useTealium } from '../../../hooks'

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
    onChange,
    ...selectProps
}: FilterSelectPropType & Props<FilterOptionType, true>) => {
    const { logDropdownSelectionEvent } = useTealium()
    const onFocus: AriaOnFocus<FilterOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const handleOnChangeWithLogging = (
        newValue: OnChangeValue<FilterOptionType, true>,
        actionMeta: ActionMeta<FilterOptionType>
    ) => {
        if (onChange) {
            const action = actionMeta.action
            // This is done because we are handling the values outside react-select onChange function
            if (action === 'select-option' && actionMeta.option?.value) {
                logDropdownSelectionEvent({
                    text: actionMeta.option.value,
                    heading: label,
                })
            } else if (action === 'remove-value') {
                logDropdownSelectionEvent({
                    text: `${action}: ${actionMeta.removedValue?.value}`,
                    heading: label,
                })
            } else if (action) {
                logDropdownSelectionEvent({
                    text: action,
                    heading: label,
                })
            }
            onChange(newValue, actionMeta)
        }
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
                onChange={handleOnChangeWithLogging}
                {...selectProps}
            />
        </div>
    )
}
