import React from 'react'
import { useField } from 'formik'
import { Fieldset } from '@trussworks/react-uswds'
import { FieldRadio } from '../FieldRadio/FieldRadio'
import { PoliteErrorMessage } from '../../'

import styles from './FieldYesNo.module.scss'
import classNames from 'classnames'

/**
 * This component renders a pair of radio buttons with Yes and No as the options.
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside of a Formik form context.
 *
 * If you want to use these components outside a Formik form, you can use the
 * ReactUSWDS components directly.
 */

export type FieldYesNoProps = {
    name: string
    label: string
    hint?: React.ReactNode
    showError?: boolean
    id: string
    variant?: 'TOPLEVEL' | 'SUBHEAD' // subhead variant used for nested fields yes/no fields under an overarching heading
} & React.JSX.IntrinsicElements['input']

export const FieldYesNo = ({
    name,
    label,
    hint,
    showError = false,
    variant = 'TOPLEVEL',
    id,
    className,
    ...inputProps
}: FieldYesNoProps): React.ReactElement => {
    const [_field, meta] = useField({ name })

    const classes = classNames(
        {
            [styles.yesnofieldsecondary]: variant === 'SUBHEAD',
        },
        className
    )

    const isRequired =
        inputProps['aria-required'] !== false && inputProps.required !== false // consumer must explicitly say this field is not required, otherwise we assume aria-required
    return (
        <Fieldset
            role="radiogroup"
            aria-required={isRequired}
            id={id}
            legend={label}
            className={classes}
            data-testid="yes-no-radio-fieldset"
        >
            {inputProps['aria-required'] !== undefined && (
                <span className={styles.requiredOptionalText}>
                    {isRequired ? 'Required' : 'Optional'}
                </span>
            )}
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
            <span className={styles.optionsContainer}>
                <FieldRadio
                    id={id + 'Yes'}
                    name={name}
                    label="Yes"
                    aria-required={isRequired}
                    value="YES"
                />
                <FieldRadio
                    id={id + 'No'}
                    className={styles.no}
                    name={name}
                    label="No"
                    aria-required={isRequired}
                    value="NO"
                />
            </span>
        </Fieldset>
    )
}

// HELPERS
export type FieldYesNoFormValue = 'YES' | 'NO' | undefined // Use for formik string value
export type FieldYesNoUserValue = 'Yes' | 'No' | undefined // Use for user facing display
export type FieldYesNoBoolean = true | false | undefined // Use for sending to backend

export const booleanAsYesNoFormValue = (bool?: boolean): FieldYesNoFormValue =>
    bool ? 'YES' : bool === false ? 'NO' : undefined

export const booleanAsYesNoUserValue = (bool?: boolean): FieldYesNoUserValue =>
    bool ? 'Yes' : bool === false ? 'No' : undefined

export const yesNoFormValueAsBoolean = (
    maybeString: FieldYesNoFormValue | string
): FieldYesNoBoolean => {
    return maybeString === 'YES'
        ? true
        : maybeString === 'NO'
        ? false
        : undefined
}
