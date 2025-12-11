import React, { useEffect } from 'react'
import {
    FormContainer,
    PageActions,
    DynamicStepIndicator,
    FormNotificationContainer,
} from '../../../../components'
import { Form } from '@trussworks/react-uswds'
import { useRouteParams, useCurrentRoute } from '../../../../hooks'
import { generatePath, useNavigate } from 'react-router-dom'
import { RoutesRecord, EQRO_SUBMISSION_FORM_ROUTES } from '@mc-review/constants'
import styles from '../../StateSubmissionForm.module.scss'
import { usePage } from '../../../../contexts/PageContext'

export const EQROContractDetails = (): React.ReactElement => {
    const { id, contractSubmissionType } = useRouteParams()
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()

    const contactsPagePath = generatePath(RoutesRecord.SUBMISSIONS_CONTACTS, {
        id,
        contractSubmissionType,
    })
    const submissionDetailsPath = generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
        id,
        contractSubmissionType,
    })

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EQRO_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
            </FormNotificationContainer>
            <FormContainer id="contractDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={() => console.info('submit placeholder')}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Contract details</legend>
                        <div>Contract details placeholder</div>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(submissionDetailsPath)}
                        continueOnClick={() => navigate(contactsPagePath)}
                        saveAsDraftOnClick={() =>
                            console.info('Save as draft function placeholder')
                        }
                        backOnClickUrl={submissionDetailsPath}
                        continueOnClickUrl={contactsPagePath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
