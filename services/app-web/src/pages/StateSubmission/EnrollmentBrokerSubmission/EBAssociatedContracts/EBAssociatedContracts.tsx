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

// Empty Associated contracts page for the Enrollment Broker submission form.
// TODO: add form fields come in a follow-up ticket.
export const EBAssociatedContracts = (): React.ReactElement => {
    const navigate = useNavigate()
    const { id } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { currentRoute } = useCurrentRoute()
    const { loggedInUser } = useAuth()

    const activeMainContentId = 'associatedContractsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const contractDetailsPath = getSubmissionPath(
        'SUBMISSIONS_CONTRACT_DETAILS',
        'ENROLLMENT_BROKER',
        id
    )

    const contactsPagePath = getSubmissionPath(
        'SUBMISSIONS_CONTACTS',
        'ENROLLMENT_BROKER',
        id
    )

    const handleContinue = async () => {
        navigate(contactsPagePath)
    }

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={EB_SUBMISSION_FORM_ROUTES}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    showPageErrorMessage={false}
                />
            </FormNotificationContainer>
            <FormContainer id="associatedContracts">
                <Form
                    className={styles.formContainer}
                    onSubmit={(e) => {
                        e.preventDefault()
                        void handleContinue()
                    }}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Associated contracts</legend>
                        <p className="margin-0">
                            The Enrollment Broker associated contracts form is
                            coming soon.
                        </p>
                    </fieldset>
                    <PageActions
                        backOnClick={() => navigate(contractDetailsPath)}
                        backOnClickUrl={contractDetailsPath}
                        continueOnClickUrl={contactsPagePath}
                    />
                </Form>
            </FormContainer>
        </div>
    )
}
