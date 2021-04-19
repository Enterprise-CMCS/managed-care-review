import React from 'react'
import { Field, useField } from 'formik'
import { Radio } from '@trussworks/react-uswds'
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


export type FieldRadioProps = {
    id: string
    name: string
    label: string
    checked: boolean
    disabled: boolean
}

export const FieldRadio = ({
    id,
    name,
    label,
    checked,
    disabled,
    ...inputProps
}: FieldRadioProps): React.ReactElement => {
    const [field] = useField({name});
    return (
        <Radio 
            id={id} 
            label={label} 
            {...field} 
            {...inputProps} 
            checked={checked}
            disabled={disabled}
        />
    )
}
