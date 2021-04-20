import React from 'react'
import { useField } from 'formik'
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

export type FieldRadioProps = {
    name: string
    label: string
    id: string
}

export const FieldRadio = ({
    name,
    label,
    id,
    ...inputProps
}: FieldRadioProps): React.ReactElement => {
    const [field] = useField({ name });
    return (
        
        <Radio
            id={id} 
            label={label}
            {...field} 
            {...inputProps} 
        /> 
    )
}
