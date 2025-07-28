import React from 'react'
import Select, { GroupBase, Props } from 'react-select'

/**
 * This component renders the react-select combobox with added accessibility changes that should apply
 * app-wide.
 */

export const AccessibleSelect = <
    Option,
    IsMulti extends boolean = false,
    Group extends GroupBase<Option> = GroupBase<Option>,
>(
    props: Props<Option, IsMulti, Group>
) => {
    // Allow user defined styles, without overriding accessibility styling.
    const { styles } = props
    const passedStyles = styles

    return (
        <Select
            {...props}
            styles={{
                ...passedStyles,
                placeholder: (baseStyles) => ({
                    ...baseStyles,
                    color: '#3D4551', // 7:1 contrast rule. Not aware of background color
                    ...passedStyles?.placeholder,
                }),
                dropdownIndicator: (baseStyles) => ({
                    ...baseStyles,
                    color: '#565C65', // 3:1 UI contrast rule
                }),
                clearIndicator: (baseStyles) => ({
                    ...baseStyles,
                    color: '#565C65', // 3:1 UI contrast rule
                }),
                control: (baseStyles) => ({
                    ...baseStyles,
                    borderColor: '#565C65', // 3:1 UI contrast rule
                }),
            }}
        />
    )
}
