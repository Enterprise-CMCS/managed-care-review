import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form } from '@trussworks/react-uswds'
import { EB_SUBMISSION_FORM_ROUTES } from '@mc-review/constants'
import {
    DynamicStepIndicator,
    FormContainer,
    FormNotificationContainer,
    PageActions,
} from '../../../../components'
import { PageBannerAlerts } from '../../SharedSubmissionComponents'
import { useCurrentRoute, useRouteParams } from '../../../../hooks'
import { usePage } from '../../../../contexts/PageContext'
import { useAuth } from '../../../../contexts/AuthContext'
import styles from '../../StateSubmissionForm.module.scss'
import { getSubmissionPath } from '../../../../routeHelpers'

// Empty Contract details page for the Enrollment Broker submission form.
// TODO: add form fields come in a follow-up ticket.
export const EBContractDetails = (): React.ReactElement => {
    const navigate = useNavigate()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const submissionDetailsPath = getSubmissionPath(
        'SUBMISSIONS_TYPE', // Submission is now created so go to the "edit" path.
        'ENROLLMENT_BROKER',
        id
    )

    const associatedContractsPagePath = getSubmissionPath(
        'SUBMISSIONS_ASSOCIATED_CONTRACTS',
        'ENROLLMENT_BROKER',
        id
    )

    const handleContinue = async () => {
        navigate(associatedContractsPagePath)
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EB_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                    customPageTitles={{
                        SUBMISSIONS_TYPE: 'Submission details',
                    }}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="contractDetails">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">EB Contract details</legend>
                        <p
                            className="margin-0"
                            data-testid="eb-submission-details-placeholder"
                        >
                            The Enrollment Broker contract details form is
                            coming soon.
                        </p>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(submissionDetailsPath)}
                        backOnClickUrl={submissionDetailsPath}
                        continueOnClickUrl={associatedContractsPagePath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
