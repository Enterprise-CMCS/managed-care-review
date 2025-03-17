import React from 'react'
import { Grid } from '@trussworks/react-uswds'
import { ColumnSizes } from '@trussworks/react-uswds/lib/components/grid/types'

export type ChildrenType = React.ReactNode | React.ReactPortal
export type ChildrenPairType = ChildrenType[][]

export type MultiColumnGridProps = {
    columns: Exclude<ColumnSizes, string | boolean>
    children: React.ReactNode
}

export const groupedChildren = (
    columns: number,
    children: ChildrenType[]
): ChildrenPairType => {
    return children.reduce(
        (pairedChildren: ChildrenPairType, child, index, array) => {
            if (index % columns === 0) {
                pairedChildren.push(array.slice(index, index + columns))
            }
            return pairedChildren
        },
        []
    )
}

export const MultiColumnGrid = ({
    columns,
    children,
}: MultiColumnGridProps) => {
    const rows: ChildrenPairType = groupedChildren(
        columns,
        React.Children.toArray(children)
    )
    // This calculates the column size, restricting the min, max, and round down to be within the ColumnSizes.
    const columnSize = Math.max(
        1,
        Math.min(12, Math.floor(12 / columns))
    ) as ColumnSizes
    return (
        <>
            {rows.map((childrenPairs, rIndex) => (
                <Grid
                    row
                    gap
                    key={`grid-row-${rIndex}`}
                    data-testid={`grid-row-${rIndex}`}
                >
                    {childrenPairs.map((child, cIndex) => (
                        <Grid
                            tablet={{ col: columnSize }}
                            key={`grid-row-${rIndex}-column-${cIndex}`}
                        >
                            {child}
                        </Grid>
                    ))}
                </Grid>
            ))}
        </>
    )
}
