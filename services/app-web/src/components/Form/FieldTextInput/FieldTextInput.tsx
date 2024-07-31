import React from 'react'
import { useField } from 'formik'
import { Label, TextInput, FormGroup } from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../../'

import styles from './FieldTextInput.module.scss'
import classNames from 'classnames'
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
    variant?: 'TOPLEVEL' | 'SUBHEAD' // subhead used for forms where fields could be nested under a larger heading or label
    id: string
    hint?: React.ReactNode
    error?: string
    showError: boolean
    name: string
    type: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url'
} & React.ComponentProps<typeof TextInput>

export const FieldTextInput = ({
    className,
    label,
    variant = 'TOPLEVEL',
    id,
    hint,
    error,
    showError,
    name,
    type,
    onBlur,
    ...inputProps
}: TextInputProps): React.ReactElement => {
    const [field, meta] = useField({ name })

    const classes = classNames(
        {
            [styles.nestedField]: variant === 'SUBHEAD',
        },
        className
    )

    // Latch into onBlur to do any input cleaning
    // Initial use case is to trim away trailing whitespace in email addresses
    const customOnBlur = (e: React.FocusEvent<HTMLInputElement, Element>) => {
        if (!e) return
        e.currentTarget.value = field.value.trim()
        if (onBlur) onBlur(e)
    }

    return (
        <FormGroup error={showError} className={classes}>
            <Label htmlFor={id} error={showError}>
                {label}
            </Label>
            {showError && meta.error && (
                <PoliteErrorMessage formFieldLabel={label}>
                    {meta.error}
                </PoliteErrorMessage>
            )}
            {hint && (
                <div
                    role="note"
                    aria-labelledby={id}
                    className="usa-hint margin-top-1"
                >
                    {hint}
                </div>
            )}
            <TextInput
                {...field}
                {...inputProps}
                id={id}
                name={name}
                validationStatus={showError ? 'error' : undefined}
                type={type}
                onBlur={customOnBlur}
            />
        </FormGroup>
    )
}
