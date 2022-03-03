import React from 'react'
import { useField } from 'formik'
import { Label, TextInput, FormGroup } from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../../'

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

export type TextInputProps = {
    label: string
    id: string
    hint?: React.ReactNode
    error?: string
    showError: boolean
    name: string
    type: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url'
} & JSX.IntrinsicElements['input']

export const FieldTextInput = ({
    label,
    id,
    hint,
    error,
    showError,
    name,
    type,
    ...inputProps
}: TextInputProps): React.ReactElement => {
    const [field, meta] = useField({ name })
    return (
        <FormGroup error={showError}>
            <Label htmlFor={id} error={showError}>
                {label}
            </Label>
            {showError && meta.error && (
                <PoliteErrorMessage>{meta.error}</PoliteErrorMessage>
            )}
            {hint && (
                <div role="note" aria-labelledby={id} className="usa-hint margin-top-1">
                    {hint}
                </div>
            )}
            <TextInput
                {...field}
                {...inputProps}
                id={id}
                name={name}
                error={showError}
                type={type}
            />
        </FormGroup>
    )
}
