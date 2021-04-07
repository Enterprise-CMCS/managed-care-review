import React from 'react'

import { GridContainer } from '@trussworks/react-uswds'
import { SubmissionType } from './SubmissionType'

export const NewStateSubmissionForm = (): React.ReactElement => {
    return (
        <GridContainer>
            <SubmissionType />
        </GridContainer>
    )
}
