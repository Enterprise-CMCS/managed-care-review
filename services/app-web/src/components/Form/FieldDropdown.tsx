import React from 'react'
import { useField } from 'formik'
import {
    ErrorMessage,
    Label,
    Dropdown,
    FormGroup,
} from '@trussworks/react-uswds'

/**
 * This component renders a ReactUSWDS TextInput component inside of a FormGroup,
 * with a Label and ErrorMessage.
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside of a Formik form context.
 *
 * If you want to use these components outside a Formik form, you can use the
 * ReactUSWDS components directly.
 */

type DropdownOption = {
    key: string
    value: string
}

export type FieldDropdownProps = {
    label: string
    id: string
    hint?: React.ReactNode
    error?: string
    showError: boolean
    name: string
    options: DropdownOption[]
    showDropdownPlaceholderText?: boolean
}

export const FieldDropdown = ({
    label,
    id,
    hint,
    error,
    showError,
    name,
    options,
    showDropdownPlaceholderText,
    ...inputProps
}: FieldDropdownProps): React.ReactElement => {
    const [field] = useField({ name })
    return (
        <FormGroup error={showError}>
            <Label htmlFor={id} error={showError}>
                {label}
            </Label>
            {showError && <ErrorMessage>{error}</ErrorMessage>}
            {hint && (
                <div aria-labelledby={id} className="usa-hint margin-top-1">
                    {hint}
                </div>
            )}
            <Dropdown id={id} {...field} {...inputProps}>
                {showDropdownPlaceholderText && <option value="">- Select -</option>}
                {options &&
                    options.map(({key, value}) => (
                        <option key={key} value={key}>
                            {value}
                        </option>
                    ))
                }
            </Dropdown>
        </FormGroup>
    )
}
