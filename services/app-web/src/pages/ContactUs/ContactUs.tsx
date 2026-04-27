import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import pageStyles from '../Help/Help.module.scss'

export const ContactUs = (): React.ReactElement => {
    return (
        <GridContainer className={pageStyles.pageContainer}>
            <h1>Contact Us</h1>
        </GridContainer>
    )
}
