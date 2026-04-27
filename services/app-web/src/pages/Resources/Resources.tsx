import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import pageStyles from '../Help/Help.module.scss'

export const Resources = (): React.ReactElement => {
    return (
        <GridContainer className={pageStyles.pageContainer}>
            <h1>Resources and Training</h1>
        </GridContainer>
    )
}
