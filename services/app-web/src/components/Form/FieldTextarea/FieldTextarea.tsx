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
    showRequiredOptionalLabel?: boolean
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
    showRequiredOptionalLabel = false,
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

    let isRequiredLabel
    if (showRequiredOptionalLabel) {
        if (isRequired) {
            isRequiredLabel = 'Required'
        } else {
            isRequiredLabel = 'Optional'
        }
    }
    return (
        <FormGroup error={showError}>
            <Label htmlFor={id} error={showError}>
                {label}
            </Label>
            <span className={styles.requiredOptionalText}>
                {isRequiredLabel}
            </span>
            {showError && <PoliteErrorMessage>{meta.error}</PoliteErrorMessage>}
            {hint && (
                <div
                    role="note"
                    aria-labelledby={id}
                    className="usa-hint margin-top-1"
                >
                    {hint}
                </div>
            )}
            <Textarea
                {...field}
                {...inputProps}
                id={id}
                name={name}
                error={showError}
                onBlur={customOnBlur}
            />
        </FormGroup>
    )
}
