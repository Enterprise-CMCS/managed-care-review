import React from 'react'

import { DynamicStepIndicator } from '../../../components/DynamicStepIndicator'
import {
    STATE_SUBMISSION_FORM_ROUTES,
    STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS,
} from '../../../constants/routes'
import stylesForm from '../StateSubmissionForm.module.scss'
import stylesSideNav from '../../SubmissionSideNav/SubmissionSideNav.module.scss'
import { FormContainer } from '../../../components/FormContainer/FormContainer'
import { SubmissionType } from '../SubmissionType/SubmissionType'
import { GridContainer } from '@trussworks/react-uswds'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'

export const NewStateSubmissionForm = (): React.ReactElement => {
    const ldClient = useLDClient()
    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    return (
        <div className={stylesSideNav.backgroundForm}>
            <GridContainer className={stylesSideNav.container}>
                <div className={stylesForm.formPage}>
                    <DynamicStepIndicator
                        formPages={
                            hideSupportingDocs
                                ? STATE_SUBMISSION_FORM_ROUTES_WITHOUT_SUPPORTING_DOCS
                                : STATE_SUBMISSION_FORM_ROUTES
                        }
                        currentFormPage={'SUBMISSIONS_TYPE'}
                    />

                    <FormContainer id="new-submission">
                        <SubmissionType />
                    </FormContainer>
                </div>
            </GridContainer>
        </div>
    )
}
