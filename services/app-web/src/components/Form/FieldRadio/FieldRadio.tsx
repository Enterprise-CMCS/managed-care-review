import React from 'react'
import { Field, useField } from 'formik'
import { Radio, ErrorMessage, FormGroup } from '@trussworks/react-uswds'
import { options } from 'yargs'

/**
 * This component renders a checkbox
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside of a Formik form context.
 *
 * If you want to use these components outside a Formik form, you can use the
 * ReactUSWDS components directly.
 */

type RadioOption = {
    id: string
    label: string
}

export type FieldRadioProps = {
    name: string
    label: string
    legend: string
    showError: boolean
    error?: string
    options: RadioOption[]
    hint?: React.ReactNode
}

export const FieldRadio = ({
    name,
    label,
    legend,
    showError,
    error,
    options,
    hint,
    ...inputProps
}: FieldRadioProps): React.ReactElement => {
    const [field] = useField({ name });
    return (
        <FormGroup error={showError}>
            <fieldset className="usa-fieldset">
                <legend className="usa-legend">{legend}</legend>
                {showError && <ErrorMessage>{error}</ErrorMessage>}
                {hint && (
                    <div className="usa-hint margin-top-1">
                        {hint}
                    </div>
                )}
                {options &&
                    options.map(({id, label})=>(
                        <Radio
                            key={id} 
                            id={id} 
                            label={label}
                            {...field} 
                            {...inputProps} 
                        /> 
                    ))
                }
            </fieldset>
        </FormGroup>
    )
}
