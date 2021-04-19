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
    id: string
    label: string
}

export type FieldDropdownProps = {
    label: string
    id: string
    hint?: React.ReactNode
    showError: boolean
    name: string
    options: DropdownOption[]
    required?: boolean
    showDropdownPlaceholderText?: boolean
}

export const FieldDropdown = ({
    label,
    id,
    hint,
    showError,
    name,
    options,
    required = false,
    showDropdownPlaceholderText,
    ...inputProps
}: FieldDropdownProps): React.ReactElement => {
    const [field, meta] = useField({ name })
    return (
        <FormGroup error={showError}>
            <Label htmlFor={id} error={showError}>
                {label}
            </Label>
            {showError && meta.error && (
                <ErrorMessage>{meta.error}</ErrorMessage>
            )}
            {hint && (
                <div aria-labelledby={id} className="usa-hint margin-top-1">
                    {hint}
                </div>
            )}
            <Dropdown
                id={id}
                {...field}
                {...inputProps}
                aria-required={required}
            >
                {showDropdownPlaceholderText && (
                    <option value="">- Select -</option>
                )}
                {options &&
                    options.map(({ id, label }) => (
                        <option key={id} value={id}>
                            {label}
                        </option>
                    ))}
            </Dropdown>
        </FormGroup>
    )
}
