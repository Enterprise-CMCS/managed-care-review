import React from 'react'
import stylesForm from '../../StateSubmissionForm.module.scss'
import stylesSideNav from '../../../SubmissionSideNav/SubmissionSideNav.module.scss'
import { FormContainer } from '../../../../components'
import { SubmissionType } from '../SubmissionType'
import { GridContainer } from '@trussworks/react-uswds'

export const NewStateSubmissionForm = (): React.ReactElement => {
    return (
        <div className={stylesSideNav.backgroundForm}>
            <GridContainer className={stylesSideNav.container}>
                <div className={stylesForm.formPage}>
                    <FormContainer id="new-submission">
                        <SubmissionType />
                    </FormContainer>
                </div>
            </GridContainer>
        </div>
    )
}
