import React from 'react'
import styles from '../Select.module.scss'
import Select, { AriaOnFocus, type MultiValue, type Props as SelectProps } from 'react-select'
import type {} from 'react-select/base';
import { useField } from 'formik'

type FieldSelectOptionType = {
    readonly label: string
    readonly value: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

type FieldSelectType = {
    name: string
    initialValues: string[],
    dropdownOptions: FieldSelectOptionType[],
    optionDescriptionSingular?: string,
    error?: boolean
} & SelectProps<FieldSelectOptionType, true>


/**
 * This component renders the react-select combobox with a generic types wrapper
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside a Formik form context.
 */
const FieldSelect  = ({
    name,
    isMulti = true,
    isSearchable = true,
    initialValues,
    dropdownOptions,
    optionDescriptionSingular = 'option', // could be something like submission or user or state
    error,
    ...selectProps
}: FieldSelectType) => {
    const [_field, _meta, helpers] = useField({ name })
    const { isLoading } = selectProps

    const onFocus: AriaOnFocus<FieldSelectOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const defaultValues =
        initialValues.length && dropdownOptions.length
            ? initialValues.map((value) => {
                  const name = dropdownOptions?.find(
                      (option) => option.value === value
                  )?.label
                  if (!name) {
                      return {
                          value: value,
                          label: `Unknown ${optionDescriptionSingular}`,
                      }
                  }
                  return {
                      label: name,
                      value: value,
                  }
              })
            : []

    const noOptionsMessage = () => {
        if (isLoading) {
            return `Loading ${optionDescriptionSingular}s...`
        }
        if (error) {
            return `Could not load ${optionDescriptionSingular}s. Please refresh your browser.`
        }
        if (!dropdownOptions.length) {
            return `No ${optionDescriptionSingular}s found`
        }
    }

    return (
        <Select
            value={defaultValues}
            placeholder={isLoading ? `Loading ${optionDescriptionSingular}s...` : 'Select...'}
            noOptionsMessage={() => noOptionsMessage()}
            loadingMessage={() => `Loading ${optionDescriptionSingular}s...`}
            className={styles.multiSelect}
            classNamePrefix="select"
            id={`${name}-FieldSelect`}
            name={name}
            options={error || isLoading ? undefined : dropdownOptions}
            isSearchable
            isMulti
            maxMenuHeight={200} // using this to limit size of the display to ~ 5 options with no font zooming
            aria-label={`${optionDescriptionSingular} (required)`}
            ariaLiveMessages={{
                onFocus,
            }}
            onChange={(selectedOptions:MultiValue<FieldSelectOptionType>) =>
                helpers.setValue(
                    selectedOptions.map((item: { value: string }) => item.value)
                )
            }
            {...selectProps}
        />
    )
}

export {FieldSelect}
export type {FieldSelectOptionType}