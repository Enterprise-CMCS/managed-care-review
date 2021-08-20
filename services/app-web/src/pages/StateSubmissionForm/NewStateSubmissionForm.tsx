import React from 'react'

import { DynamicStepIndicator } from '../../components/DynamicStepIndicator/'
import { GridContainer } from '@trussworks/react-uswds'
import { STATE_SUBMISSION_FORM_ROUTES } from '../../constants/routes'
import { SubmissionType } from './SubmissionType/SubmissionType'

export const NewStateSubmissionForm = (): React.ReactElement => {
    return (
        <>
            <DynamicStepIndicator
                formPages={STATE_SUBMISSION_FORM_ROUTES}
                currentFormPage={'SUBMISSIONS_TYPE'}
            />

            <GridContainer>
                <SubmissionType />
            </GridContainer>
        </>
    )
}
