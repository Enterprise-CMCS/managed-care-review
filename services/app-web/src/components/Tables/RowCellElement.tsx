import React from 'react'

type RowCellElementPropType = {
    element: 'td' | 'th'
    children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

/**
 * A flexible row cell component that renders either a table header (th) or table data (td) element.
 * Automatically applies the appropriate scope attribute for accessibility when rendering as a header.
 * This sets up table cell association for tables.
 *
 * @param element - The HTML element type to render ('th' for headers, 'td' for data cells)
 * @returns A table cell element with proper semantic markup and accessibility attributes
 */
export const RowCellElement = ({
    element,
    children,
    ...rest
}: RowCellElementPropType): React.ReactElement => {
    const Element = element
    return (
        <Element {...rest} scope={element === 'th' ? 'row' : undefined}>
            {children}
        </Element>
    )
}
