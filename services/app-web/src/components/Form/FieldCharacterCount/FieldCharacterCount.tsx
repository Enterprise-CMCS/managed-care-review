import React from 'react'
import { useField } from 'formik'
import { Label, FormGroup, CharacterCount } from '@trussworks/react-uswds'
import { PoliteErrorMessage } from '../..'
import type { TextAreaProps } from '../FieldTextarea/FieldTextarea'
import styles from '../FieldTextarea/FieldTextarea.module.scss'

export const FieldCharacterCount = ({
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
    const isOverLimit = (field.value?.length ?? 0) > 1500
    const showErrorBorder = showError || isOverLimit

    // Latch into onBlur to do any input cleaning
    // Initial use case is to trim away trailing whitespace in email addresses
    const customOnBlur = (
        e: React.FocusEvent<HTMLTextAreaElement, Element>
    ) => {
        if (!e) return
        e.currentTarget.value = field.value.trim()
        e.target.setCustomValidity('') //Keep this to remove the floating tool tip built into CharacterCount
        if (onBlur) onBlur(e)
    }

    return (
        <FormGroup error={showErrorBorder}>
            <Label htmlFor={id}>{label}</Label>
            <span className={styles.requiredOptionalText}>
                {isRequired ? 'Required' : 'Optional'}
            </span>
            {showError && meta.touched && (
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
            <CharacterCount
                id={id}
                name={name}
                defaultValue={field.value}
                onChange={field.onChange}
                aria-describedby={hint ? `${id}-hint` : undefined}
                onBlur={customOnBlur}
                maxLength={1500}
                isTextArea
                rows={2}
                error={showErrorBorder}
                {...inputProps}
            />
        </FormGroup>
    )
}
