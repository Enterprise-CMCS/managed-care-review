import styles from '../Select.module.scss'
import Select, {
    ActionMeta,
    AriaOnFocus,
    OnChangeValue,
    type Props as SelectProps,
} from 'react-select'
import type {} from 'react-select/base'
import { useField } from 'formik'
import { useTealium } from '../../../hooks'

type FieldSelectOptionType = {
    readonly label: string
    readonly value: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

type FieldSelectType = {
    name: string
    initialValues: FieldSelectOptionType[]
    dropdownOptions: FieldSelectOptionType[]
    label: string
    optionDescriptionSingular?: string
    error?: boolean
} & SelectProps<FieldSelectOptionType, true>

/**
 * This component renders the react-select combobox with a generic types wrapper
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside a Formik form context.
 */
const FieldSelect = ({
    name,
    isMulti = true,
    isSearchable = true,
    initialValues,
    dropdownOptions,
    optionDescriptionSingular = 'option', // could be something like submission or user or state
    error,
    label,
    ...selectProps
}: FieldSelectType) => {
    const [_field, _meta, helpers] = useField({ name })
    const { isLoading } = selectProps
    const { logDropdownSelectionEvent } = useTealium()

    const onFocus: AriaOnFocus<FieldSelectOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const handleOnChangeWithLogging = async (
        newValue: OnChangeValue<FieldSelectOptionType, true>,
        actionMeta: ActionMeta<FieldSelectOptionType>
    ) => {
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

        await helpers.setValue(newValue)
    }

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
            defaultValue={initialValues}
            placeholder={
                isLoading
                    ? `Loading ${optionDescriptionSingular}s...`
                    : 'Select...'
            }
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
            onChange={handleOnChangeWithLogging}
            {...selectProps}
        />
    )
}

export { FieldSelect }
export type { FieldSelectOptionType }
