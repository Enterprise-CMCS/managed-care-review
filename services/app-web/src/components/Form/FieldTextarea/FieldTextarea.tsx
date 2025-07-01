import React from 'react'
import { useField } from 'formik'
import { Label, Textarea, FormGroup } from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../..'
import styles from './FieldTextarea.module.scss'

/**
 * This component renders a ReactUSWDS TextArea component inside of a FormGroup,
 * with a Label and ErrorMessage.
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside of a Formik form context.
 *
 * If you want to use these components outside a Formik form, you can use the
 * ReactUSWDS components directly.
 */

export type TextAreaProps = {
    label: string
    id: string
    hint?: React.ReactNode
    error?: string
    showError: boolean
    name: string
} & JSX.IntrinsicElements['textarea']

export const FieldTextarea = ({
    label,
    id,
    hint,
    error,
    showError,
    name,
    onBlur,
    ...inputProps
}: TextAreaProps): React.ReactElement => {
    const [field, meta] = useField({ name })
    const isRequired = inputProps['aria-required']

    // Latch into onBlur to do any input cleaning
    // Initial use case is to trim away trailing whitespace in email addresses
    const customOnBlur = (
        e: React.FocusEvent<HTMLTextAreaElement, Element>
    ) => {
        if (!e) return
        e.currentTarget.value = field.value.trim()
        if (onBlur) onBlur(e)
    }

    return (
        <FormGroup error={showError}>
            <Label htmlFor={id}>{label}</Label>
            <span className={styles.requiredOptionalText}>
                {isRequired ? 'Required' : 'Optional'}
            </span>
            {showError && (
                <PoliteErrorMessage formFieldLabel={label}>
                    {meta.error}
                </PoliteErrorMessage>
            )}
            {hint && (
                <p
                    role="note"
                    id={`${id}-hint`}
                    className="mcr-note margin-top-1"
                >
                    {hint}
                </p>
            )}
            <Textarea
                {...field}
                {...inputProps}
                id={id}
                aria-describedby={hint ? `${id}-hint` : undefined}
                name={name}
                error={showError}
                onBlur={customOnBlur}
            />
        </FormGroup>
    )
}
