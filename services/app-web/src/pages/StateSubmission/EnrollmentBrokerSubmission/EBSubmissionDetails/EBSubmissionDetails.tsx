import React, { useEffect } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import {
    EB_SUBMISSION_FORM_ROUTES,
    RoutesRecord,
} from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useCurrentRoute } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'

// Placeholder for the Enrollment Broker submission form.
export const EBSubmissionDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const location = useLocation()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    const isNewSubmission = matchPath(
        RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM,
        location.pathname
    )

    const activeMainContentId = 'submissionDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EB_SUBMISSION_FORM_ROUTES}
                    currentFormPage={
                        currentRoute === 'SUBMISSIONS_NEW_SUBMISSION_FORM'
                            ? 'SUBMISSIONS_TYPE' // Map new submission route to first step
                            : currentRoute
                    }
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="SubmissionDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => e.preventDefault()}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Submission details</legend>
                        <p
                            className="margin-0"
                            data-testid="eb-submission-details-placeholder"
                        >
                            The Enrollment Broker submission form is coming
                            soon.
                        </p>
                    </fieldset>
                    <PageActions
                        pageVariant={isNewSubmission ? 'FIRST' : 'EDIT_FIRST'}
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
