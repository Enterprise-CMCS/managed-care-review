import React from 'react'

import { DynamicStepIndicator } from '../../../components/DynamicStepIndicator'
import { STATE_SUBMISSION_FORM_ROUTES } from '../../../constants/routes'
import stylesForm from '../StateSubmissionForm.module.scss'
import stylesSideNav from '../../SubmissionSideNav/SubmissionSideNav.module.scss'
import { FormContainer } from '../FormContainer'
import { SubmissionType } from '../SubmissionType/SubmissionType'
import { GridContainer } from '@trussworks/react-uswds'

export const NewStateSubmissionForm = (): React.ReactElement => {
    return (
        <div className={stylesSideNav.backgroundForm}>
            <GridContainer className={stylesSideNav.container}>
                <div className={stylesForm.formPage}>
                    <div className={stylesForm.stepIndicator}>
                        <DynamicStepIndicator
                            formPages={STATE_SUBMISSION_FORM_ROUTES}
                            currentFormPage={'SUBMISSIONS_TYPE'}
                        />
                    </div>

                    <FormContainer id="new-submission">
                        <SubmissionType />
                    </FormContainer>
                </div>
            </GridContainer>
        </div>
    )
}
