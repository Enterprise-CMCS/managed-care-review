import React from 'react'

import { GridContainer, Grid } from '@trussworks/react-uswds'
/**
 * Wrap logo pngs in image tag and uswds classes
 */
export const Error400 = (): React.ReactElement => {
    return (
        <GridContainer>
            <Grid row>
                <h2>Oops! Something went wrong...</h2>
            </Grid>
        </GridContainer>
    )
}
