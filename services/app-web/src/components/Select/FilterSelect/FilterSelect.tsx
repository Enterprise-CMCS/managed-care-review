import React, { useRef, useEffect } from 'react'
import styles from '../Select.module.scss'
import Select, {
    AriaOnFocus,
    Props,
    SelectInstance,
    GroupBase,
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

    useEffect(() => {
        if (
            toggleClearFilter !== prevToggleClearFilter &&
            selectInputRef?.current?.clearValue
        ) {
            selectInputRef.current.clearValue()
        }
    }, [toggleClearFilter, prevToggleClearFilter, selectInputRef])

    return (
        <div className={styles.filter}>
            {label && <label htmlFor={`${name}-filterSelect`}>{label}</label>}
            <Select
                ref={selectInputRef}
                options={filterOptions}
                loadingMessage={() => 'Loading submissions...'}
                className={styles.multiSelect}
                classNamePrefix="select"
                id={`${name}-filterSelect`}
                name={`${name}-filter`}
                isSearchable
                isMulti
                aria-label={`${name} filter selection`}
                ariaLiveMessages={{
                    onFocus,
                }}
                {...selectProps}
            />
        </div>
    )
}
