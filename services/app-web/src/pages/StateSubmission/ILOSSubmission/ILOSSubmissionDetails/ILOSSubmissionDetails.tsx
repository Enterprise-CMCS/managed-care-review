import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import { ILOS_SUBMISSION_FORM_ROUTES, RoutesRecord } from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'

const ILOS_STEP_TITLES = {
    SUBMISSIONS_TYPE: 'ILOS actuarial report',
    SUBMISSIONS_RATE_DETAILS: 'Associated rate certifications',
}

// Placeholder for the first page of the ILOS actuarial report submission form.
export const ILOSSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={ILOS_SUBMISSION_FORM_ROUTES}
                    currentFormPage="SUBMISSIONS_TYPE"
                    customPageTitles={ILOS_STEP_TITLES}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="ILOSActuarialReport">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => e.preventDefault()}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">
                            ILOS actuarial report
                        </legend>
                        <p
                            className="margin-0"
                            data-testid="ilos-submission-details-placeholder"
                        >
                            The ILOS actuarial report form is coming soon.
                        </p>
                    </fieldset>
                    <PageActions
                        pageVariant="FIRST"
                        backOnClick={() =>
                            navigate(RoutesRecord.DASHBOARD_SUBMISSIONS)
                        }
                        backOnClickUrl={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        // Placeholder: nothing to save yet
                        disableContinue
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
