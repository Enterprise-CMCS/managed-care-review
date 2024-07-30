import React from 'react'
import { useField } from 'formik'
import { Radio } from '@trussworks/react-uswds'
import { useTealium } from '../../../hooks'

/**
 * This component renders a radio button
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
    parent_component_heading: string
    parent_component_type?: string | 'form'
    radio_button_title: string
    list_position: number
    list_options: number
} & JSX.IntrinsicElements['input']

export const FieldRadio = ({
    name,
    label,
    id,
    parent_component_heading,
    parent_component_type = 'form',
    radio_button_title,
    list_position,
    list_options,
    value,
    onClick,
    ...inputProps
}: FieldRadioProps): React.ReactElement => {
    const [field] = useField({ name, value, type: 'radio' })
    const { logRadioButtonEvent } = useTealium()
    const isRequired =
        inputProps['aria-required'] !== false && inputProps.required !== false // consumer must explicitly say this field is not required, otherwise we assume aria-required

    const handleOnClickWithLogging = (
        e: React.MouseEvent<HTMLInputElement>
    ) => {
        logRadioButtonEvent({
            parent_component_heading,
            parent_component_type,
            radio_button_title,
            list_options,
            list_position,
            field_type: inputProps['aria-required'] ? 'required' : 'optional',
            //  TODO: form_fill_status: Unsure about the requirement of this field. Selecting the radio answers the question, so wouldn't this be always TRUE?
            form_fill_status: true,
        })
        if (onClick) {
            onClick(e)
        }
    }

    return (
        <Radio
            id={id}
            label={label}
            {...field}
            {...inputProps}
            name={name}
            aria-required={isRequired}
            onClick={handleOnClickWithLogging}
        />
    )
}
