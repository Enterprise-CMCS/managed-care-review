import React from 'react'
import { useField } from 'formik'
import { Checkbox } from '@trussworks/react-uswds'
import { useTealium } from '../../../hooks'

/**
 * This component renders a checkbox
 *
 * It relies on the Formik useField hook to work, so it must ALWAYS be rendered
 * inside of a Formik form context.
 *
 * If you want to use these components outside a Formik form, you can use the
 * ReactUSWDS components directly.
 */

export type FieldCheckboxProps = {
    name: string
    label: string
    id: string
    heading: string
    parent_component_type?: string | 'form'
    parent_component_heading: string
} & JSX.IntrinsicElements['input']

export const FieldCheckbox = ({
    name,
    label,
    id,
    heading,
    parent_component_type = 'form',
    parent_component_heading,
    value,
    onClick,
    ...inputProps
}: FieldCheckboxProps): React.ReactElement => {
    const [field] = useField({ name, value, type: 'checkbox' })
    const { logCheckboxEvent } = useTealium()

    const handleClickWithLogging = (e: React.MouseEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement
        logCheckboxEvent({
            event_name: target.checked
                ? 'checkbox_selected'
                : 'checkbox_unselected',
            text: label,
            heading,
            parent_component_type,
            parent_component_heading,
            field_type: 'required',
        })
        if (onClick) {
            onClick(e)
        }
    }

    const isRequired =
        inputProps['aria-required'] !== false && inputProps.required !== false // consumer must explicitly say this field is not required, otherwise we assume aria-required
    return (
        <Checkbox
            id={id}
            label={label}
            {...field}
            {...inputProps}
            aria-required={isRequired}
            name={name}
            onClick={handleClickWithLogging}
        />
    )
}
